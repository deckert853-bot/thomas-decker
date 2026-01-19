
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Send, 
  Settings, 
  FileText, 
  Table as TableIcon, 
  Building2,
  Calendar,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { Transaction, TransactionType, Profile, AppStore } from './types';
import { exportToJson, exportToCsv, exportToPdf } from './services/exportService';
import { sendToDiscord } from './services/discordService';

const DEFAULT_PROFILE_ID = "default";

const App: React.FC = () => {
  // --- State ---
  const [store, setStore] = useState<AppStore>(() => {
    const saved = localStorage.getItem('finanz_manager_store');
    if (saved) return JSON.parse(saved);
    return {
      activeProfileId: DEFAULT_PROFILE_ID,
      profiles: {
        [DEFAULT_PROFILE_ID]: {
          id: DEFAULT_PROFILE_ID,
          name: "Mein Unternehmen",
          taxId: "",
          responsible: "",
          taxRate: 5.0,
          monthFilter: "",
          webhook1: "",
          webhook2: "",
          entries: []
        }
      }
    };
  });

  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<TransactionType>(TransactionType.INCOME);
  const [status, setStatus] = useState({ message: 'Bereit', type: 'info' });

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('finanz_manager_store', JSON.stringify(store));
  }, [store]);

  // --- Derived State ---
  const activeProfile = useMemo(() => {
    return store.profiles[store.activeProfileId] || store.profiles[Object.keys(store.profiles)[0]];
  }, [store]);

  const filteredEntries = useMemo(() => {
    const mf = activeProfile.monthFilter;
    return activeProfile.entries
      .filter(e => !mf || e.date.startsWith(mf))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeProfile]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredEntries.forEach(e => {
      if (e.type === TransactionType.INCOME) income += e.amount;
      else expense += e.amount;
    });
    const tax = Math.max(0, (income - expense) * (activeProfile.taxRate / 100));
    return { income, expense, tax, net: income - expense - tax };
  }, [filteredEntries, activeProfile.taxRate]);

  // --- Handlers ---
  const updateProfile = (updates: Partial<Profile>) => {
    setStore(prev => ({
      ...prev,
      profiles: {
        ...prev.profiles,
        [prev.activeProfileId]: { ...prev.profiles[prev.activeProfileId], ...updates }
      }
    }));
  };

  const addEntry = () => {
    if (!formDesc || !formAmount || !formDate) return;
    const newEntry: Transaction = {
      id: Date.now().toString(),
      date: formDate,
      description: formDesc,
      amount: parseFloat(formAmount),
      type: formType
    };
    updateProfile({ entries: [...activeProfile.entries, newEntry] });
    setFormDesc('');
    setFormAmount('');
    setStatus({ message: 'Eintrag hinzugefügt', type: 'success' });
  };

  const deleteEntry = (id: string) => {
    updateProfile({ entries: activeProfile.entries.filter(e => e.id !== id) });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.entries && Array.isArray(data.entries)) {
          updateProfile({ ...data, id: activeProfile.id });
          setStatus({ message: 'Import erfolgreich', type: 'success' });
        }
      } catch (err) {
        setStatus({ message: 'Fehler beim Import', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const addNewProfile = () => {
    const name = prompt("Name des neuen Profils:");
    if (!name) return;
    const id = "p-" + Date.now();
    setStore(prev => ({
      activeProfileId: id,
      profiles: {
        ...prev.profiles,
        [id]: {
          id, name, taxId: "", responsible: "", taxRate: 5.0, monthFilter: "", webhook1: "", webhook2: "", entries: []
        }
      }
    }));
  };

  const deleteProfile = () => {
    if (Object.keys(store.profiles).length <= 1) return;
    if (!confirm("Soll dieses Profil wirklich gelöscht werden?")) return;
    setStore(prev => {
      const newProfiles = { ...prev.profiles };
      delete newProfiles[prev.activeProfileId];
      return {
        activeProfileId: Object.keys(newProfiles)[0],
        profiles: newProfiles
      };
    });
  };

  const handleDiscordSend = async (hookNums: (1 | 2)[]) => {
    setStatus({ message: 'Sende an Discord...', type: 'info' });
    const hooks = hookNums.map(n => n === 1 ? activeProfile.webhook1 : activeProfile.webhook2);
    const success = await sendToDiscord(activeProfile, hooks);
    if (success) setStatus({ message: 'Discord Übertragung erfolgreich', type: 'success' });
    else setStatus({ message: 'Fehler bei Discord Übertragung', type: 'error' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Briefcase className="w-10 h-10 text-indigo-600" />
            Finanz-Manager <span className="text-indigo-600">Pro</span>
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Verwalten Sie Ihre Finanzen professionell</p>
        </div>
        
        <div className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border shadow-sm ${
          status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 
          status.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
          'bg-indigo-50 text-indigo-700 border-indigo-200'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            status.type === 'success' ? 'bg-green-500' : 
            status.type === 'error' ? 'bg-red-500' : 
            'bg-indigo-500 animate-pulse'
          }`} />
          {status.message}
        </div>
      </header>

      {/* Profile & Settings Section */}
      <section className="bg-white rounded-2xl p-6 mb-8 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          
          <div className="md:col-span-3">
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              Profil / Unternehmen
            </label>
            <div className="flex gap-2">
              <select 
                value={store.activeProfileId}
                onChange={(e) => setStore(prev => ({ ...prev, activeProfileId: e.target.value }))}
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-slate-800 font-medium"
              >
                {Object.values(store.profiles).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button 
                onClick={addNewProfile}
                className="p-2 bg-slate-900 text-white rounded-xl hover:bg-black transition"
                title="Neu"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button 
                onClick={deleteProfile}
                className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition"
                title="Löschen"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Steuernummer</label>
            <input 
              type="text"
              value={activeProfile.taxId}
              onChange={(e) => updateProfile({ taxId: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="z.B. LS-2026"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Verantwortlich</label>
            <input 
              type="text"
              value={activeProfile.responsible}
              onChange={(e) => updateProfile({ responsible: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="Name"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Steuer %</label>
            <input 
              type="number"
              step="0.01"
              value={activeProfile.taxRate}
              onChange={(e) => updateProfile({ taxRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Monatsfilter
            </label>
            <input 
              type="month"
              value={activeProfile.monthFilter}
              onChange={(e) => updateProfile({ monthFilter: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          {/* Webhook Configuration */}
          <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">Discord Webhook 1 (Fraktion)</label>
              <input 
                type="password"
                value={activeProfile.webhook1}
                onChange={(e) => updateProfile({ webhook1: e.target.value })}
                className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono"
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">Discord Webhook 2 (Archiv)</label>
              <input 
                type="password"
                value={activeProfile.webhook2}
                onChange={(e) => updateProfile({ webhook2: e.target.value })}
                className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono"
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar: New Entry Form */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl lg:sticky lg:top-8">
            <h2 className="text-xl font-bold mb-6 text-slate-900 flex items-center gap-2">
              <Plus className="w-6 h-6 text-indigo-600" />
              Neuer Eintrag
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Datum</label>
                <input 
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Beschreibung</label>
                <input 
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder="z.B. Materialeinkauf"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Betrag ($)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-bold text-lg"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Typ</label>
                <select 
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as TransactionType)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  <option value={TransactionType.INCOME}>Einnahme (+)</option>
                  <option value={TransactionType.EXPENSE}>Ausgabe (-)</option>
                </select>
              </div>

              <button 
                onClick={addEntry}
                disabled={!formDesc || !formAmount}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              >
                Hinzufügen
              </button>

              <div className="pt-6 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Daten-Tools</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => exportToJson(activeProfile)} className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition">
                    <Download className="w-3 h-3" /> JSON
                  </button>
                  <button onClick={() => exportToCsv(activeProfile)} className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition">
                    <FileText className="w-3 h-3" /> CSV
                  </button>
                  <button onClick={() => exportToPdf(activeProfile)} className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black transition">
                    <FileText className="w-3 h-3" /> PDF herunterladen
                  </button>
                  <div className="col-span-2 relative">
                    <input 
                      type="file" 
                      onChange={handleImport}
                      accept=".json"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold hover:bg-indigo-100 transition pointer-events-none">
                      <Upload className="w-3 h-3" /> Daten importieren
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area: Transactions & Summary */}
        <main className="lg:col-span-8 space-y-8">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Einnahmen</p>
              <p className="text-2xl font-black text-green-600">${summary.income.toFixed(2)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Ausgaben</p>
              <p className="text-2xl font-black text-red-600">-${summary.expense.toFixed(2)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Steuer ({activeProfile.taxRate}%)</p>
              <p className="text-2xl font-black text-slate-700">-${summary.tax.toFixed(2)}</p>
            </div>
            <div className={`p-5 rounded-2xl border shadow-md ${summary.net >= 0 ? 'bg-indigo-600 border-indigo-400' : 'bg-red-600 border-red-400'}`}>
              <p className="text-xs font-bold text-indigo-100 uppercase mb-1">Reingewinn</p>
              <p className="text-2xl font-black text-white">${summary.net.toFixed(2)}</p>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <TableIcon className="w-6 h-6 text-indigo-600" />
                Transaktionen
              </h2>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {filteredEntries.length} Einträge
              </span>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Datum</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Beschreibung</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Betrag</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition group">
                      <td className="px-6 py-4 text-sm text-slate-500 tabular-nums">{e.date}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{e.description}</p>
                        <p className={`text-[10px] font-bold uppercase ${e.type === TransactionType.INCOME ? 'text-green-500' : 'text-red-500'}`}>
                          {e.type}
                        </p>
                      </td>
                      <td className={`px-6 py-4 text-right font-black text-base whitespace-nowrap ${e.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                        {e.type === TransactionType.INCOME ? '+' : '-'}${e.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => deleteEntry(e.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-slate-400 font-medium italic">
                        Keine Einträge für diesen Zeitraum gefunden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col md:flex-row gap-4">
            <button 
              onClick={() => handleDiscordSend([1, 2])}
              className="flex-1 bg-indigo-600 text-white px-8 py-5 rounded-2xl font-black text-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <Send className="w-6 h-6" />
              An beide Webhooks senden
            </button>
            <button 
              onClick={() => handleDiscordSend([1])}
              className="px-8 py-5 bg-white text-indigo-600 border-2 border-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition active:scale-[0.98]"
            >
              Nur Webhook #1 (Intern)
            </button>
          </div>

        </main>
      </div>
    </div>
  );
};

export default App;
