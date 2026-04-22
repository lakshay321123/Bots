'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, Download, Sparkles, RotateCcw, FileSpreadsheet,
  CheckSquare, Square, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight,
  Save, Folder, Trash2, Plus, X, Filter as FilterIcon, BarChart3,
  Hash, Type, Calendar as CalendarIcon, AlertTriangle, Check
} from 'lucide-react';

// localStorage-backed shim mirroring storage (claude.ai artifact) API
const storage = {
  async get(key) {
    if (typeof window === 'undefined') return null;
    const value = window.localStorage.getItem(key);
    if (value === null) return null;
    return { key, value };
  },
  async set(key, value) {
    if (typeof window === 'undefined') return null;
    window.localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    if (typeof window === 'undefined') return null;
    window.localStorage.removeItem(key);
    return { key, deleted: true };
  },
};

const BRAND = {
  cyan: '#00B5D6',
  cyanLight: '#D6EBF2',
  cyanMid: '#68D1E6',
  cyanSoft: '#A1DEED',
  grayLight: '#E6E6E6',
  grayMid: '#CCCCCC',
  grayDark: '#616161',
  black: '#000000',
  surface: '#F5F7F8',
  white: '#FFFFFF',
  danger: '#D8332E',
  warning: '#C57300',
};

function getColumnLetter(index) {
  let letter = '';
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

function hashColumnSignature(columnNames) {
  const str = [...columnNames].map(n => String(n || '').trim().toLowerCase()).sort().join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function profileColumn(rows, colIndex) {
  const values = rows.map(r => r.data[colIndex]);
  const total = values.length;
  const nonEmpty = values.filter(v => v !== '' && v !== null && v !== undefined);
  const emptyPct = total === 0 ? 0 : Math.round(((total - nonEmpty.length) / total) * 100);
  const uniqueCount = new Set(nonEmpty.map(v => String(v))).size;

  let numCount = 0, dateCount = 0;
  const sample = nonEmpty.slice(0, 50);
  for (const v of sample) {
    const s = String(v).trim();
    if (s === '') continue;
    if (!isNaN(Number(s)) && /^-?\d+(\.\d+)?$/.test(s)) numCount++;
    else if (/\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4}/.test(s) && !isNaN(Date.parse(s))) dateCount++;
  }

  let type = 'text';
  if (sample.length > 0) {
    if (numCount / sample.length > 0.7) type = 'number';
    else if (dateCount / sample.length > 0.6) type = 'date';
  }
  if (total > 0 && nonEmpty.length === 0) type = 'empty';

  return { emptyPct, uniqueCount, type, total, nonEmpty: nonEmpty.length };
}

function evaluateRule(rule, rowData) {
  if (rule.colIdx == null) return true;
  const raw = rowData[rule.colIdx];
  const val = String(raw ?? '').trim().toLowerCase();
  const compareVal = String(rule.value ?? '').trim().toLowerCase();

  switch (rule.operator) {
    case 'equals': return val === compareVal;
    case 'not_equals': return val !== compareVal;
    case 'contains': return compareVal === '' ? true : val.includes(compareVal);
    case 'not_contains': return compareVal === '' ? true : !val.includes(compareVal);
    case 'starts_with': return val.startsWith(compareVal);
    case 'ends_with': return val.endsWith(compareVal);
    case 'is_empty': return val === '';
    case 'is_not_empty': return val !== '';
    case 'greater_than': {
      const a = Number(val), b = Number(compareVal);
      return !isNaN(a) && !isNaN(b) && a > b;
    }
    case 'less_than': {
      const a = Number(val), b = Number(compareVal);
      return !isNaN(a) && !isNaN(b) && a < b;
    }
    default: return true;
  }
}

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
];

function TypeIcon({ type, size = 10 }) {
  if (type === 'number') return <Hash size={size} />;
  if (type === 'date') return <CalendarIcon size={size} />;
  if (type === 'empty') return <AlertTriangle size={size} />;
  return <Type size={size} />;
}

export default function ExcelConverter() {
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [step, setStep] = useState('pick');
  const [outputOrder, setOutputOrder] = useState([]);
  const [columnProfiles, setColumnProfiles] = useState({});
  const [filterRules, setFilterRules] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [currentTemplateId, setCurrentTemplateId] = useState(null);
  const [showTemplateDrawer, setShowTemplateDrawer] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [matchedTemplate, setMatchedTemplate] = useState(null);

  const loadTemplates = useCallback(async () => {
    try {
      const idxRes = await storage.get('templates:index').catch(() => null);
      const ids = idxRes ? JSON.parse(idxRes.value) : [];
      const loaded = [];
      for (const id of ids) {
        try {
          const res = await storage.get(`templates:${id}`);
          if (res) loaded.push(JSON.parse(res.value));
        } catch (e) { /* skip */ }
      }
      loaded.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setTemplates(loaded);
      return loaded;
    } catch (e) {
      console.error('loadTemplates failed', e);
      return [];
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // Keep outputOrder in sync with columns: add any new col ids, drop any that no longer exist
  useEffect(() => {
    if (columns.length === 0) return;
    const colIds = columns.map(c => c.id);
    setOutputOrder(prev => {
      const kept = prev.filter(id => colIds.includes(id));
      const missing = colIds.filter(id => !kept.includes(id));
      if (missing.length === 0 && kept.length === prev.length) return prev;
      return [...kept, ...missing];
    });
  }, [columns]);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setError('');
    setSuccessMessage('');
    setFileName(file.name);
    setStep('pick');
    setOutputOrder([]);
    setFilterRules([]);
    setCurrentTemplateId(null);
    setMatchedTemplate(null);
    setShowFilters(false);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', raw: false });

      if (!rawData || rawData.length < 2) {
        setError('File needs at least a header row and one data row.');
        return;
      }

      const headers = rawData[0];
      const dataRows = rawData.slice(1);

      const newColumns = headers.map((name, i) => {
        const cleanName = String(name || `Column ${getColumnLetter(i)}`).trim();
        return {
          id: `col_${i}`,
          letter: getColumnLetter(i),
          originalName: cleanName,
          displayName: cleanName,
          selected: true,
          originalIndex: i,
        };
      });

      const newRows = dataRows.map((row, i) => ({
        index: i,
        data: row,
        selected: true,
      }));

      const profiles = {};
      newColumns.forEach(col => {
        profiles[col.id] = profileColumn(newRows, col.originalIndex);
      });

      setColumns(newColumns);
      setRows(newRows);
      setColumnProfiles(profiles);
      setOutputOrder(newColumns.map(c => c.id));

      const signature = hashColumnSignature(newColumns.map(c => c.originalName));
      const currentTemplates = await loadTemplates();
      const match = currentTemplates.find(t => t.signature === signature);
      if (match) setMatchedTemplate(match);

    } catch (err) {
      setError("Could not read that file. Make sure it's a valid Excel or CSV.");
      console.error(err);
    }
  }, [loadTemplates]);

  const toggleColumn = (id) => setColumns(cols => cols.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  const toggleRow = (index) => setRows(rs => rs.map(r => r.index === index ? { ...r, selected: !r.selected } : r));
  const toggleAllColumns = () => {
    const all = columns.every(c => c.selected);
    setColumns(cols => cols.map(c => ({ ...c, selected: !all })));
  };
  const toggleAllRows = () => {
    const all = rows.every(r => r.selected);
    setRows(rs => rs.map(r => ({ ...r, selected: !all })));
  };
  const updateColumnName = (id, newName) => setColumns(cols => cols.map(c => c.id === id ? { ...c, displayName: newName } : c));

  const rowsPassingFilters = useMemo(() => {
    const activeRules = filterRules.filter(r => r.colIdx != null && r.operator);
    if (activeRules.length === 0) return null;
    const passing = new Set();
    for (const row of rows) {
      let pass = true;
      for (const rule of activeRules) {
        if (!evaluateRule(rule, row.data)) { pass = false; break; }
      }
      if (pass) passing.add(row.index);
    }
    return passing;
  }, [rows, filterRules]);

  const effectivelySelectedRows = useMemo(() => {
    return rows.filter(r => {
      if (!r.selected) return false;
      if (rowsPassingFilters && !rowsPassingFilters.has(r.index)) return false;
      return true;
    });
  }, [rows, rowsPassingFilters]);

  const addFilterRule = () => {
    const firstSelectedCol = columns.find(c => c.selected);
    if (!firstSelectedCol) {
      setError('Select at least one column before adding filter rules.');
      return;
    }
    setFilterRules(rules => [...rules, {
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      colIdx: firstSelectedCol.originalIndex,
      operator: 'equals',
      value: '',
    }]);
    setShowFilters(true);
  };
  const updateFilterRule = (id, patch) => setFilterRules(rules => rules.map(r => r.id === id ? { ...r, ...patch } : r));
  const removeFilterRule = (id) => setFilterRules(rules => rules.filter(r => r.id !== id));
  const clearFilters = () => setFilterRules([]);

  const goToPreview = () => {
    const selectedIds = columns.filter(c => c.selected).map(c => c.id);
    if (selectedIds.length === 0) { setError('Tick at least one column first.'); return; }
    if (effectivelySelectedRows.length === 0) { setError('No rows match your filters and selections.'); return; }
    const newOrder = [
      ...outputOrder.filter(id => selectedIds.includes(id)),
      ...selectedIds.filter(id => !outputOrder.includes(id)),
    ];
    setOutputOrder(newOrder);
    setStep('preview');
    setError('');
  };
  const goBackToPick = () => { setStep('pick'); setError(''); };
  const moveColumn = (colId, direction) => {
    setOutputOrder(order => {
      const idx = order.indexOf(colId);
      if (idx === -1) return order;
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= order.length) return order;
      const newOrder = [...order];
      [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
      return newOrder;
    });
  };

  const aiSuggestNames = async () => {
    setAiLoading(true);
    setError('');
    try {
      const selectedCols = columns.filter(c => c.selected);
      if (selectedCols.length === 0) { setError('Tick at least one column first.'); setAiLoading(false); return; }
      const sampleData = selectedCols.map(c => ({
        original: c.originalName,
        samples: rows.slice(0, 5).map(r => r.data[c.originalIndex]).filter(v => v !== '' && v != null).map(v => String(v)),
      }));
      const prompt = `You are helping standardize healthcare RCM column names.

Source columns with samples:
${JSON.stringify(sampleData, null, 2)}

Return ONLY a JSON array of clean professional names in same order. Use standard healthcare billing terms (First Name, Date of Birth, Medical Record Number, not fname/DOB_raw/MRN_ID). Keep concise.

Example: ["First Name", "Last Name", "Date of Birth"]

Return only the JSON array.`;
      const response = await fetch("/api/suggest-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`API returned ${response.status}${errBody ? ': ' + errBody : ''}`);
      }
      const data = await response.json();
      const textBlock = data.content.find(b => b.type === 'text');
      if (!textBlock) throw new Error('No text response');
      const cleaned = textBlock.text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      const suggestions = JSON.parse(cleaned);
      if (!Array.isArray(suggestions)) throw new Error('Not an array');
      setColumns(cols => cols.map(c => {
        if (!c.selected) return c;
        const idx = selectedCols.findIndex(sc => sc.id === c.id);
        if (idx >= 0 && suggestions[idx]) return { ...c, displayName: String(suggestions[idx]) };
        return c;
      }));
      setSuccessMessage(`Claude renamed ${selectedCols.length} columns.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(`AI suggest failed: ${err.message}.`);
      console.error(err);
    } finally { setAiLoading(false); }
  };

  const downloadOutput = () => {
    try {
      const outputCols = outputOrder.map(id => columns.find(c => c.id === id)).filter(Boolean);
      const selRows = effectivelySelectedRows;
      if (outputCols.length === 0) { setError('No columns selected.'); return; }
      if (selRows.length === 0) { setError('No rows selected.'); return; }
      const outputData = [
        outputCols.map(c => c.displayName),
        ...selRows.map(r => outputCols.map(c => {
          const v = r.data[c.originalIndex];
          return v == null ? '' : v;
        })),
      ];
      const ws = XLSX.utils.aoa_to_sheet(outputData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Output');
      const baseName = fileName.replace(/\.(xlsx|xls|csv)$/i, '');
      XLSX.writeFile(wb, `${baseName}_zeus_output.xlsx`);
      setSuccessMessage(`Downloaded: ${outputCols.length} columns × ${selRows.length.toLocaleString()} rows`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) { setError(`Download failed: ${err.message}`); }
  };

  const openSaveDialog = () => {
    if (columns.filter(c => c.selected).length === 0) {
      setError('Select columns before saving a template.');
      return;
    }
    const currentName = currentTemplateId ? templates.find(t => t.id === currentTemplateId)?.name : '';
    setSaveName(currentName || '');
    setSaveNotes(currentTemplateId ? templates.find(t => t.id === currentTemplateId)?.notes || '' : '');
    setShowSaveDialog(true);
  };

  const saveTemplate = async () => {
    if (!saveName.trim()) { setError('Template needs a name.'); return; }
    const id = currentTemplateId || `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const existing = currentTemplateId ? templates.find(t => t.id === id) : null;
    const signature = hashColumnSignature(columns.map(c => c.originalName));
    const template = {
      id,
      name: saveName.trim(),
      notes: saveNotes.trim(),
      signature,
      sourceColumnCount: columns.length,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      useCount: existing?.useCount || 0,
      config: {
        selectedOriginalNames: columns.filter(c => c.selected).map(c => c.originalName),
        renames: Object.fromEntries(columns.filter(c => c.displayName.trim() !== c.originalName).map(c => [c.originalName, c.displayName])),
        outputOrderByName: outputOrder.map(id => columns.find(c => c.id === id)?.originalName).filter(Boolean),
        filterRules: filterRules.map(r => ({
          ...r,
          colName: columns.find(c => c.originalIndex === r.colIdx)?.originalName,
        })),
      },
    };
    try {
      await storage.set(`templates:${id}`, JSON.stringify(template));
      const idxRes = await storage.get('templates:index').catch(() => null);
      const ids = idxRes ? JSON.parse(idxRes.value) : [];
      if (!ids.includes(id)) await storage.set('templates:index', JSON.stringify([...ids, id]));
      setCurrentTemplateId(id);
      await loadTemplates();
      setShowSaveDialog(false);
      setSuccessMessage(`Saved as "${template.name}"`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { setError(`Save failed: ${err.message}`); }
  };

  const applyTemplate = async (template) => {
    const cfg = template.config;
    setColumns(cols => cols.map(c => {
      const wasSelected = cfg.selectedOriginalNames?.includes(c.originalName);
      const newName = cfg.renames?.[c.originalName];
      return {
        ...c,
        selected: !!wasSelected,
        displayName: newName || c.originalName,
      };
    }));
    setOutputOrder(prevOrder => {
      const orderedByName = cfg.outputOrderByName || [];
      const newOrder = [];
      for (const name of orderedByName) {
        const col = columns.find(c => c.originalName === name);
        if (col) newOrder.push(col.id);
      }
      return newOrder;
    });
    if (cfg.filterRules && cfg.filterRules.length > 0) {
      const remapped = cfg.filterRules.map(r => {
        const col = columns.find(c => c.originalName === r.colName);
        return col ? { ...r, colIdx: col.originalIndex } : null;
      }).filter(Boolean);
      setFilterRules(remapped);
      if (remapped.length > 0) setShowFilters(true);
    }
    setCurrentTemplateId(template.id);
    setMatchedTemplate(null);
    setShowTemplateDrawer(false);
    try {
      const updated = { ...template, useCount: (template.useCount || 0) + 1, lastUsedAt: Date.now() };
      await storage.set(`templates:${template.id}`, JSON.stringify(updated));
      await loadTemplates();
    } catch (e) { /* non-fatal */ }
    setSuccessMessage(`Applied template: ${template.name}`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const deleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await storage.delete(`templates:${id}`);
      const idxRes = await storage.get('templates:index').catch(() => null);
      const ids = idxRes ? JSON.parse(idxRes.value) : [];
      await storage.set('templates:index', JSON.stringify(ids.filter(i => i !== id)));
      if (currentTemplateId === id) setCurrentTemplateId(null);
      await loadTemplates();
      setSuccessMessage('Template deleted.');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) { setError(`Delete failed: ${err.message}`); }
  };

  const reset = () => {
    setFileName(''); setColumns([]); setRows([]); setError(''); setSuccessMessage('');
    setStep('pick'); setOutputOrder([]); setColumnProfiles({}); setFilterRules([]);
    setCurrentTemplateId(null); setMatchedTemplate(null); setShowFilters(false);
  };

  const selectedColCount = columns.filter(c => c.selected).length;
  const selectedRowsRaw = rows.filter(r => r.selected);
  const hasData = columns.length > 0;
  const displayRows = rows.slice(0, 100);
  // Page 1: render ALL columns in outputOrder (selected or not; unselected shown dimmed)
  const pickCols = outputOrder.map(id => columns.find(c => c.id === id)).filter(Boolean);
  // Page 2: only selected columns in outputOrder — this is the final file
  const outputCols = pickCols.filter(c => c.selected);
  const outputBaseName = fileName.replace(/\.(xlsx|xls|csv)$/i, '');
  const currentTemplate = currentTemplateId ? templates.find(t => t.id === currentTemplateId) : null;
  const filteredRowCount = rowsPassingFilters ? rowsPassingFilters.size : rows.length;
  const excludedByFilter = rows.length - filteredRowCount;
  const excludedByUntick = selectedRowsRaw.length < rows.length ? (rows.length - selectedRowsRaw.length) : 0;

  return (
    <div style={{ background: BRAND.surface, padding: '24px', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', background: BRAND.white, borderRadius: '12px', border: `0.5px solid ${BRAND.grayLight}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', position: 'relative' }}>

        <div style={{ background: BRAND.cyan, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={18} color="white" strokeWidth={1.75} />
            <span style={{ color: 'white', fontWeight: 500, fontSize: '14px', letterSpacing: '0.5px' }}>ZEUS · FILE CONVERTER</span>
            {currentTemplate && (
              <span style={{ color: 'white', fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '4px', marginLeft: '6px' }}>
                using · {currentTemplate.name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowTemplateDrawer(true)}
              style={{ background: 'rgba(255,255,255,0.18)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', letterSpacing: '0.3px' }}
            >
              <Folder size={12} /> Templates · {templates.length}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'white', fontSize: '11px', letterSpacing: '0.5px', background: step === 'pick' ? 'rgba(255,255,255,0.25)' : 'transparent', padding: '3px 8px', borderRadius: '4px', fontWeight: step === 'pick' ? 500 : 400 }}>1 · PICK</span>
              <ChevronRight size={12} color={BRAND.cyanLight} />
              <span style={{ color: 'white', fontSize: '11px', letterSpacing: '0.5px', background: step === 'preview' ? 'rgba(255,255,255,0.25)' : 'transparent', padding: '3px 8px', borderRadius: '4px', fontWeight: step === 'preview' ? 500 : 400 }}>2 · PREVIEW</span>
            </div>
          </div>
        </div>

        {!hasData && (
          <div style={{ padding: '48px 24px' }}>
            <label
              style={{ display: 'block', maxWidth: '520px', margin: '0 auto', padding: '44px 24px', border: `2px dashed ${BRAND.cyan}`, borderRadius: '12px', background: BRAND.cyanLight + '50', textAlign: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = BRAND.cyanLight + '80'}
              onMouseLeave={(e) => e.currentTarget.style.background = BRAND.cyanLight + '50'}
            >
              <Upload size={36} color={BRAND.cyan} strokeWidth={1.5} style={{ marginBottom: '14px' }} />
              <p style={{ fontSize: '16px', fontWeight: 500, color: BRAND.black, margin: '0 0 6px' }}>Drop your Excel file here</p>
              <p style={{ fontSize: '13px', color: BRAND.grayDark, margin: 0 }}>or click to browse · .xlsx, .xls, .csv</p>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            {templates.length > 0 && (
              <div style={{ maxWidth: '520px', margin: '24px auto 0' }}>
                <p style={{ fontSize: '11px', color: BRAND.grayDark, margin: '0 0 10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Your saved templates</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {templates.slice(0, 5).map(t => (
                    <div key={t.id} style={{ padding: '10px 12px', background: BRAND.white, border: `0.5px solid ${BRAND.grayLight}`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 500, margin: 0, color: BRAND.black, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                        <p style={{ fontSize: '11px', color: BRAND.grayDark, margin: '2px 0 0' }}>
                          {t.sourceColumnCount} cols · {(t.config.selectedOriginalNames?.length || 0)} kept · used {t.useCount || 0}×
                        </p>
                      </div>
                      <span style={{ fontSize: '11px', color: BRAND.cyan }}>upload matching file →</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {error && <p style={{ textAlign: 'center', color: BRAND.danger, fontSize: '13px', marginTop: '16px' }}>{error}</p>}
          </div>
        )}

        {hasData && matchedTemplate && (
          <div style={{ padding: '12px 20px', background: BRAND.cyanLight, borderBottom: `0.5px solid ${BRAND.cyan}`, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Check size={16} color={BRAND.cyan} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: BRAND.black, margin: 0 }}>Matching template found: "{matchedTemplate.name}"</p>
              <p style={{ fontSize: '11px', color: BRAND.grayDark, margin: '2px 0 0' }}>Apply saved column picks, renames, and filters?</p>
            </div>
            <button onClick={() => applyTemplate(matchedTemplate)} style={{ background: BRAND.cyan, color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>Apply</button>
            <button onClick={() => setMatchedTemplate(null)} style={{ background: 'transparent', color: BRAND.grayDark, border: 'none', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}>Dismiss</button>
          </div>
        )}

        {hasData && step === 'pick' && (
          <>
            <div style={{ padding: '12px 20px', borderBottom: `0.5px solid ${BRAND.grayLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 500, margin: 0, color: BRAND.black }}>{fileName}</p>
                <p style={{ fontSize: '12px', color: BRAND.grayDark, margin: '3px 0 0' }}>{columns.length} columns · {rows.length.toLocaleString()} rows · tick what to keep</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={aiSuggestNames} disabled={aiLoading || selectedColCount === 0} style={{ background: 'white', color: BRAND.cyan, border: `1px solid ${BRAND.cyan}`, padding: '7px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: (aiLoading || selectedColCount === 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: (aiLoading || selectedColCount === 0) ? 0.5 : 1 }}>
                  <Sparkles size={13} />{aiLoading ? '...' : 'AI names'}
                </button>
                <button onClick={reset} style={{ background: 'white', color: BRAND.grayDark, border: `1px solid ${BRAND.grayLight}`, padding: '7px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RotateCcw size={13} />New file
                </button>
                <button onClick={goToPreview} disabled={selectedColCount === 0 || effectivelySelectedRows.length === 0} style={{ background: BRAND.cyan, color: 'white', border: 'none', padding: '7px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: (selectedColCount === 0 || effectivelySelectedRows.length === 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: (selectedColCount === 0 || effectivelySelectedRows.length === 0) ? 0.5 : 1 }}>
                  Next · preview<ArrowRight size={13} />
                </button>
              </div>
            </div>

            {(successMessage || error) && (
              <div style={{ padding: '8px 20px', background: error ? '#FDEBEB' : BRAND.cyanLight, color: error ? BRAND.danger : BRAND.cyan, fontSize: '12px', fontWeight: 500, borderBottom: `0.5px solid ${BRAND.grayLight}` }}>
                {error || successMessage}
              </div>
            )}

            <div style={{ padding: '8px 20px', background: BRAND.surface, borderBottom: `0.5px solid ${BRAND.grayLight}`, display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11px', color: BRAND.grayDark, alignItems: 'center' }}>
              <button onClick={toggleAllColumns} style={{ background: 'transparent', border: 'none', color: BRAND.cyan, fontSize: '11px', fontWeight: 500, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {columns.every(c => c.selected) ? <CheckSquare size={12} /> : <Square size={12} />}
                {columns.every(c => c.selected) ? 'Deselect all columns' : 'Select all columns'}
              </button>
              <button onClick={toggleAllRows} style={{ background: 'transparent', border: 'none', color: BRAND.cyan, fontSize: '11px', fontWeight: 500, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {rows.every(r => r.selected) ? <CheckSquare size={12} /> : <Square size={12} />}
                {rows.every(r => r.selected) ? 'Deselect all rows' : 'Select all rows'}
              </button>
              <button onClick={() => setShowFilters(s => !s)} style={{ background: showFilters ? BRAND.cyanLight : 'transparent', border: 'none', color: BRAND.cyan, fontSize: '11px', fontWeight: 500, cursor: 'pointer', padding: showFilters ? '3px 8px' : 0, borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FilterIcon size={12} />Filter rows {filterRules.length > 0 && `· ${filterRules.length}`}
              </button>
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: BRAND.grayDark }}>Tip: click name to rename · use arrows to reorder columns</span>
            </div>

            {showFilters && (
              <div style={{ padding: '14px 20px', background: '#FAFAFA', borderBottom: `0.5px solid ${BRAND.grayLight}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <p style={{ fontSize: '11px', color: BRAND.grayDark, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Keep rows where</p>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {filterRules.length > 0 && (
                      <button onClick={clearFilters} style={{ background: 'transparent', border: 'none', color: BRAND.grayDark, fontSize: '11px', cursor: 'pointer', padding: 0 }}>Clear all</button>
                    )}
                    <span style={{ fontSize: '12px', color: BRAND.grayDark }}>
                      <span style={{ color: BRAND.cyan, fontWeight: 500 }}>{filteredRowCount.toLocaleString()}</span> of {rows.length.toLocaleString()} rows match
                    </span>
                  </div>
                </div>
                {filterRules.length === 0 && (
                  <p style={{ fontSize: '12px', color: BRAND.grayDark, margin: '0 0 10px' }}>No filters — all rows included.</p>
                )}
                {filterRules.map((rule, i) => {
                  const col = columns.find(c => c.originalIndex === rule.colIdx);
                  const needsValue = !['is_empty', 'is_not_empty'].includes(rule.operator);
                  return (
                    <div key={rule.id} style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {i > 0 && <span style={{ fontSize: '11px', fontWeight: 500, color: BRAND.grayDark, minWidth: '30px' }}>AND</span>}
                      <select value={rule.colIdx} onChange={e => updateFilterRule(rule.id, { colIdx: Number(e.target.value) })} style={{ fontSize: '12px', padding: '5px 8px', minWidth: '140px', border: `0.5px solid ${BRAND.grayLight}`, borderRadius: '4px' }}>
                        {columns.map(c => <option key={c.id} value={c.originalIndex}>{c.originalName}</option>)}
                      </select>
                      <select value={rule.operator} onChange={e => updateFilterRule(rule.id, { operator: e.target.value })} style={{ fontSize: '12px', padding: '5px 8px', minWidth: '130px', border: `0.5px solid ${BRAND.grayLight}`, borderRadius: '4px' }}>
                        {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                      </select>
                      {needsValue && (
                        <input type="text" value={rule.value} onChange={e => updateFilterRule(rule.id, { value: e.target.value })} placeholder="value" style={{ fontSize: '12px', padding: '5px 8px', flex: '1 1 120px', minWidth: '100px', border: `0.5px solid ${BRAND.grayLight}`, borderRadius: '4px' }} />
                      )}
                      <button onClick={() => removeFilterRule(rule.id)} style={{ background: 'transparent', border: 'none', color: BRAND.grayDark, cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
                <button onClick={addFilterRule} style={{ background: 'white', color: BRAND.cyan, border: `1px dashed ${BRAND.cyan}`, padding: '5px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <Plus size={12} />Add rule
                </button>
              </div>
            )}

            <div style={{ overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto', background: BRAND.white }}>
              <table style={{ borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'inherit' }}>
                <thead>
                  <tr>
                    <th style={{ background: BRAND.surface, border: `0.5px solid ${BRAND.grayLight}`, padding: '6px 4px', width: '44px', minWidth: '44px', position: 'sticky', left: 0, top: 0, zIndex: 3 }}></th>
                    {pickCols.map((col, i) => {
                      const isFirst = i === 0;
                      const isLast = i === pickCols.length - 1;
                      return (
                        <th key={col.id} style={{ background: col.selected ? BRAND.cyanLight : BRAND.surface, border: `0.5px solid ${BRAND.grayLight}`, padding: '4px 6px', minWidth: '160px', position: 'sticky', top: 0, zIndex: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                            <input type="checkbox" checked={col.selected} onChange={() => toggleColumn(col.id)} style={{ accentColor: BRAND.cyan, width: '14px', height: '14px', margin: 0, cursor: 'pointer', flexShrink: 0 }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <button onClick={() => moveColumn(col.id, 'left')} disabled={isFirst} style={{ background: 'transparent', border: 'none', color: isFirst ? BRAND.grayMid : BRAND.cyan, padding: '2px', borderRadius: '3px', cursor: isFirst ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }} title="Move left">
                                <ChevronLeft size={12} />
                              </button>
                              <span style={{ fontSize: '10px', color: col.selected ? BRAND.cyan : BRAND.grayDark, fontWeight: 500, minWidth: '14px', textAlign: 'center' }}>{col.letter}</span>
                              <button onClick={() => moveColumn(col.id, 'right')} disabled={isLast} style={{ background: 'transparent', border: 'none', color: isLast ? BRAND.grayMid : BRAND.cyan, padding: '2px', borderRadius: '3px', cursor: isLast ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }} title="Move right">
                                <ChevronRight size={12} />
                              </button>
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                  <tr>
                    <th style={{ background: BRAND.surface, border: `0.5px solid ${BRAND.grayLight}`, padding: '5px 4px', textAlign: 'center', fontSize: '10px', color: BRAND.grayDark, fontWeight: 400, position: 'sticky', left: 0, top: 31, zIndex: 3 }}>name</th>
                    {pickCols.map(col => (
                      <th key={col.id} style={{ background: col.selected ? BRAND.cyanLight : BRAND.surface, border: `0.5px solid ${BRAND.grayLight}`, padding: '4px 6px', textAlign: 'left', position: 'sticky', top: 31, zIndex: 2 }}>
                        <input type="text" value={col.displayName} onChange={e => updateColumnName(col.id, e.target.value)} disabled={!col.selected} style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '11px', fontWeight: 500, color: col.selected ? BRAND.black : BRAND.grayMid, padding: '3px 2px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} title={`Source: ${col.originalName}`} />
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th style={{ background: BRAND.surface, border: `0.5px solid ${BRAND.grayLight}`, padding: '4px 4px', textAlign: 'center', fontSize: '9px', color: BRAND.grayDark, fontWeight: 400, position: 'sticky', left: 0, top: 62, zIndex: 3 }}>stats</th>
                    {pickCols.map(col => {
                      const p = columnProfiles[col.id];
                      if (!p) return <th key={col.id} style={{ background: col.selected ? BRAND.cyanLight : BRAND.surface, border: `0.5px solid ${BRAND.grayLight}`, padding: '4px 6px', position: 'sticky', top: 62, zIndex: 2 }}></th>;
                      const emptyColor = p.emptyPct >= 50 ? BRAND.warning : p.emptyPct >= 20 ? BRAND.grayDark : BRAND.cyan;
                      return (
                        <th key={col.id} style={{ background: col.selected ? BRAND.cyanLight : BRAND.surface, border: `0.5px solid ${BRAND.grayLight}`, padding: '4px 8px', textAlign: 'left', position: 'sticky', top: 62, zIndex: 2, fontWeight: 400 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', color: BRAND.grayDark, flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><TypeIcon type={p.type} /> {p.type}</span>
                            <span style={{ color: emptyColor }}>{p.emptyPct}% empty</span>
                            <span>{p.uniqueCount.toLocaleString()} unique</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, i) => {
                    const passesFilter = !rowsPassingFilters || rowsPassingFilters.has(row.index);
                    const rowDimmed = !row.selected || !passesFilter;
                    return (
                      <tr key={row.index}>
                        <td style={{ background: rowDimmed ? '#FAFAFA' : BRAND.surface, border: `0.5px solid ${BRAND.grayLight}`, padding: '3px 4px', position: 'sticky', left: 0, zIndex: 1, width: '44px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'space-between' }}>
                            <input type="checkbox" checked={row.selected} onChange={() => toggleRow(row.index)} style={{ accentColor: BRAND.cyan, width: '12px', height: '12px', margin: 0, cursor: 'pointer' }} />
                            <span style={{ fontSize: '10px', color: passesFilter ? BRAND.grayDark : BRAND.warning }}>{i + 2}</span>
                          </div>
                        </td>
                        {pickCols.map(col => {
                          const val = row.data[col.originalIndex];
                          const isEmpty = val === '' || val === null || val === undefined;
                          const dimmed = !col.selected || rowDimmed;
                          return (
                            <td key={col.id} style={{ border: `0.5px solid ${BRAND.grayLight}`, padding: '6px 10px', color: dimmed ? BRAND.grayMid : (isEmpty ? BRAND.grayMid : BRAND.black), background: dimmed ? '#FAFAFA' : BRAND.white, whiteSpace: 'nowrap', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', opacity: dimmed ? 0.55 : 1 }}>
                              {isEmpty ? '—' : String(val)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {rows.length > 100 && (
              <div style={{ padding: '8px 20px', background: BRAND.cyanLight + '80', borderTop: `0.5px solid ${BRAND.grayLight}`, fontSize: '11px', color: BRAND.grayDark, textAlign: 'center' }}>
                Showing first 100 of {rows.length.toLocaleString()} rows · all matching rows flow through
              </div>
            )}

            <div style={{ padding: '12px 20px', background: BRAND.surface, borderTop: `0.5px solid ${BRAND.grayLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: BRAND.grayDark }}><span style={{ color: BRAND.cyan, fontWeight: 500 }}>{selectedColCount}</span> / {columns.length} cols</span>
                <span style={{ fontSize: '12px', color: BRAND.grayDark }}><span style={{ color: BRAND.cyan, fontWeight: 500 }}>{effectivelySelectedRows.length.toLocaleString()}</span> / {rows.length.toLocaleString()} rows</span>
                {filterRules.length > 0 && <span style={{ fontSize: '11px', color: BRAND.grayDark }}>{filterRules.length} filter rule{filterRules.length !== 1 ? 's' : ''}</span>}
              </div>
              <span style={{ fontSize: '10px', color: BRAND.grayDark, letterSpacing: '0.5px' }}>A COSENTUS DIVISION</span>
            </div>
          </>
        )}

        {hasData && step === 'preview' && (
          <>
            <div style={{ padding: '14px 20px', borderBottom: `0.5px solid ${BRAND.grayLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 500, margin: 0, color: BRAND.black }}>Output preview</p>
                <p style={{ fontSize: '12px', color: BRAND.grayDark, margin: '3px 0 0', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{outputBaseName}_zeus_output.xlsx</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={goBackToPick} style={{ background: 'white', color: BRAND.grayDark, border: `1px solid ${BRAND.grayLight}`, padding: '7px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowLeft size={14} />Back
                </button>
                <button onClick={openSaveDialog} style={{ background: 'white', color: BRAND.cyan, border: `1px solid ${BRAND.cyan}`, padding: '7px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={14} />{currentTemplate ? 'Update template' : 'Save as template'}
                </button>
                <button onClick={downloadOutput} style={{ background: BRAND.cyan, color: 'white', border: 'none', padding: '7px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Download size={14} />Download .xlsx
                </button>
              </div>
            </div>

            {(successMessage || error) && (
              <div style={{ padding: '8px 20px', background: error ? '#FDEBEB' : BRAND.cyanLight, color: error ? BRAND.danger : BRAND.cyan, fontSize: '12px', fontWeight: 500, borderBottom: `0.5px solid ${BRAND.grayLight}` }}>
                {error || successMessage}
              </div>
            )}

            <div style={{ padding: '14px 20px', background: BRAND.cyanLight + '60', borderBottom: `0.5px solid ${BRAND.grayLight}` }}>
              <p style={{ fontSize: '11px', color: BRAND.grayDark, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Before → After</p>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '10px', color: BRAND.grayDark, margin: 0, letterSpacing: '0.5px' }}>SOURCE</p>
                  <p style={{ fontSize: '16px', fontWeight: 500, color: BRAND.grayDark, margin: '2px 0 0' }}>{columns.length} × {rows.length.toLocaleString()}</p>
                </div>
                <div style={{ alignSelf: 'center' }}><ArrowRight size={16} color={BRAND.cyan} /></div>
                <div>
                  <p style={{ fontSize: '10px', color: BRAND.grayDark, margin: 0, letterSpacing: '0.5px' }}>OUTPUT</p>
                  <p style={{ fontSize: '18px', fontWeight: 500, color: BRAND.black, margin: '2px 0 0' }}>{outputCols.length} × {effectivelySelectedRows.length.toLocaleString()}</p>
                </div>
                <div style={{ flex: 1, minWidth: '180px', fontSize: '11px', color: BRAND.grayDark, borderLeft: `0.5px solid ${BRAND.grayLight}`, paddingLeft: '16px', marginLeft: '4px' }}>
                  <p style={{ margin: '0 0 3px' }}>Dropped: {columns.length - outputCols.length} cols, {(rows.length - effectivelySelectedRows.length).toLocaleString()} rows</p>
                  {excludedByFilter > 0 && <p style={{ margin: '0 0 3px' }}>· {excludedByFilter.toLocaleString()} by filter rules</p>}
                  {excludedByUntick > 0 && excludedByUntick !== (rows.length - effectivelySelectedRows.length) && <p style={{ margin: '0 0 3px' }}>· {excludedByUntick.toLocaleString()} manually unticked</p>}
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto', background: BRAND.white }}>
              <table style={{ borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'inherit' }}>
                <thead>
                  <tr>
                    <th style={{ background: BRAND.surface, border: `0.5px solid ${BRAND.grayLight}`, padding: '6px 4px', width: '44px', minWidth: '44px', fontSize: '10px', color: BRAND.grayDark, fontWeight: 400, position: 'sticky', left: 0, top: 0, zIndex: 3 }}>#</th>
                    {outputCols.map((col, i) => (
                      <th key={col.id} style={{ background: BRAND.cyan, border: `0.5px solid ${BRAND.cyan}`, padding: '10px 12px', minWidth: '160px', position: 'sticky', top: 0, zIndex: 2, textAlign: 'left' }}>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, letterSpacing: '0.5px', marginBottom: '3px' }}>COL {i + 1}</div>
                        <div style={{ fontSize: '12px', color: 'white', fontWeight: 500 }} title={`Source: ${col.originalName}`}>{col.displayName}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {effectivelySelectedRows.slice(0, 100).map((row, i) => (
                    <tr key={row.index}>
                      <td style={{ background: BRAND.surface, border: `0.5px solid ${BRAND.grayLight}`, padding: '6px 4px', textAlign: 'center', fontSize: '10px', color: BRAND.grayDark, position: 'sticky', left: 0, zIndex: 1, width: '44px' }}>{i + 1}</td>
                      {outputCols.map(col => {
                        const val = row.data[col.originalIndex];
                        const isEmpty = val === '' || val === null || val === undefined;
                        return (
                          <td key={col.id} style={{ border: `0.5px solid ${BRAND.grayLight}`, padding: '6px 10px', color: isEmpty ? BRAND.grayMid : BRAND.black, background: BRAND.white, whiteSpace: 'nowrap', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {isEmpty ? '' : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {effectivelySelectedRows.length > 100 && (
              <div style={{ padding: '8px 20px', background: BRAND.cyanLight + '80', borderTop: `0.5px solid ${BRAND.grayLight}`, fontSize: '11px', color: BRAND.grayDark, textAlign: 'center' }}>
                Previewing 100 of {effectivelySelectedRows.length.toLocaleString()} · all flow into the file
              </div>
            )}

            <div style={{ padding: '12px 20px', background: BRAND.surface, borderTop: `0.5px solid ${BRAND.grayLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{ fontSize: '12px', color: BRAND.grayDark }}>
                Final: <span style={{ color: BRAND.cyan, fontWeight: 500 }}>{outputCols.length}</span> cols × <span style={{ color: BRAND.cyan, fontWeight: 500 }}>{effectivelySelectedRows.length.toLocaleString()}</span> rows
              </span>
              <span style={{ fontSize: '10px', color: BRAND.grayDark, letterSpacing: '0.5px' }}>A COSENTUS DIVISION</span>
            </div>
          </>
        )}

        {/* Template drawer */}
        {showTemplateDrawer && (
          <div onClick={() => setShowTemplateDrawer(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '360px', maxWidth: '90%', background: 'white', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 12px rgba(0,0,0,0.08)' }}>
              <div style={{ padding: '14px 18px', background: BRAND.cyan, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Folder size={16} />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>Template library</span>
                </div>
                <button onClick={() => setShowTemplateDrawer(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ padding: '16px 18px', flex: 1, overflowY: 'auto' }}>
                {templates.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: BRAND.grayDark }}>
                    <Folder size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                    <p style={{ fontSize: '13px', margin: 0 }}>No templates saved yet.</p>
                    <p style={{ fontSize: '11px', margin: '4px 0 0' }}>Upload a file, customize, then "Save as template".</p>
                  </div>
                )}
                {templates.map(t => (
                  <div key={t.id} style={{ padding: '12px', background: currentTemplateId === t.id ? BRAND.cyanLight : BRAND.white, border: `0.5px solid ${currentTemplateId === t.id ? BRAND.cyan : BRAND.grayLight}`, borderRadius: '6px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 500, margin: 0, color: BRAND.black }}>{t.name}</p>
                        {t.notes && <p style={{ fontSize: '11px', color: BRAND.grayDark, margin: '3px 0 0', lineHeight: 1.4 }}>{t.notes}</p>}
                        <p style={{ fontSize: '10px', color: BRAND.grayDark, margin: '6px 0 0' }}>
                          {t.sourceColumnCount} cols · {t.config.selectedOriginalNames?.length || 0} kept
                          {t.config.filterRules?.length > 0 && ` · ${t.config.filterRules.length} filters`}
                          {` · used ${t.useCount || 0}×`}
                        </p>
                      </div>
                      <button onClick={() => deleteTemplate(t.id)} style={{ background: 'transparent', border: 'none', color: BRAND.grayDark, cursor: 'pointer', padding: '2px' }} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {hasData && (
                      <button onClick={() => applyTemplate(t)} disabled={t.signature !== hashColumnSignature(columns.map(c => c.originalName))} style={{ marginTop: '10px', width: '100%', background: t.signature === hashColumnSignature(columns.map(c => c.originalName)) ? BRAND.cyan : BRAND.grayLight, color: t.signature === hashColumnSignature(columns.map(c => c.originalName)) ? 'white' : BRAND.grayDark, border: 'none', padding: '6px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, cursor: t.signature === hashColumnSignature(columns.map(c => c.originalName)) ? 'pointer' : 'not-allowed' }}>
                        {t.signature === hashColumnSignature(columns.map(c => c.originalName)) ? 'Apply to this file' : 'Columns don\'t match this file'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Save dialog */}
        {showSaveDialog && (
          <div onClick={() => setShowSaveDialog(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '10px', padding: '20px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
              <p style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 4px', color: BRAND.black }}>{currentTemplate ? 'Update template' : 'Save as template'}</p>
              <p style={{ fontSize: '11px', color: BRAND.grayDark, margin: '0 0 16px' }}>Saves column picks, renames, order, and filter rules for reuse.</p>
              <label style={{ display: 'block', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', color: BRAND.grayDark, display: 'block', marginBottom: '4px' }}>Template name</span>
                <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="e.g. Athena to BCBS Billing" style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: `0.5px solid ${BRAND.grayLight}`, borderRadius: '6px', boxSizing: 'border-box' }} autoFocus />
              </label>
              <label style={{ display: 'block', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: BRAND.grayDark, display: 'block', marginBottom: '4px' }}>Notes (optional)</span>
                <textarea value={saveNotes} onChange={e => setSaveNotes(e.target.value)} placeholder="What's this template for? Which client? Any quirks?" rows={2} style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: `0.5px solid ${BRAND.grayLight}`, borderRadius: '6px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
              </label>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowSaveDialog(false)} style={{ background: 'white', color: BRAND.grayDark, border: `1px solid ${BRAND.grayLight}`, padding: '7px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveTemplate} disabled={!saveName.trim()} style={{ background: BRAND.cyan, color: 'white', border: 'none', padding: '7px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: saveName.trim() ? 'pointer' : 'not-allowed', opacity: saveName.trim() ? 1 : 0.5 }}>{currentTemplate ? 'Update' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
