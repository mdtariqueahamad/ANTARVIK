import re

with open("frontend/src/components/logistics/InventoryLedger.tsx", "r") as f:
    content = f.read()

# Add edit state and logic
import_old = "import { Package, Search, Filter } from 'lucide-react';"
import_new = "import { Package, Search, Filter, Edit2, Check } from 'lucide-react';\nimport React, { useState } from 'react';"
if "import React, { useState }" not in content:
    content = content.replace(import_old, import_new)

init_old = """export default function InventoryLedger({ items }: InventoryLedgerProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');"""

init_new = """export default function InventoryLedger({ items: initialItems }: InventoryLedgerProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  
  const role = sessionStorage.getItem('role');
  const canEdit = role === 'logistics';

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditQty(item.quantity);
  };

  const handleSave = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: editQty, days_remaining: editQty / i.daily_consumption } : i));
    setEditingId(null);
  };"""

content = content.replace(init_old, init_new)

row_old = """<div className="flex justify-between items-start mb-2">
                    <p className="text-gray-200">{item.name}</p>
                    {belowThreshold && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-severity-high/10 text-severity-high">
                        Low Stock
                      </span>
                    )}
                  </div>"""

row_new = """<div className="flex justify-between items-start mb-2">
                    <p className="text-gray-200 font-bold">{item.name}</p>
                    <div className="flex items-center gap-2">
                      {belowThreshold && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-severity-high/10 text-severity-high">
                          Low Stock
                        </span>
                      )}
                      {canEdit && editingId !== item.id && (
                        <button onClick={() => handleEdit(item)} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-emerald-400 transition-colors">
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                      {canEdit && editingId === item.id && (
                        <button onClick={() => handleSave(item.id)} className="p-1 hover:bg-emerald-500/20 rounded text-emerald-400 bg-emerald-500/10 transition-colors">
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>"""

content = content.replace(row_old, row_new)

qty_old = """<div className="text-xl font-bold font-mono text-gray-100">
                      {formatNumber(item.quantity, 0)}
                    <span className="text-gray-500 ml-1">{item.unit}</span>
                  </div>"""

qty_new = """<div className="text-xl font-bold font-mono text-gray-100 flex items-center gap-2">
                    {editingId === item.id ? (
                      <input 
                        type="number" 
                        value={editQty} 
                        onChange={(e) => setEditQty(Number(e.target.value))}
                        className="bg-black/50 border border-emerald-500/50 rounded px-2 py-1 w-24 text-emerald-400 focus:outline-none"
                      />
                    ) : (
                      formatNumber(item.quantity, 0)
                    )}
                    <span className="text-gray-500 text-sm">{item.unit}</span>
                  </div>"""

content = content.replace(qty_old, qty_new)

with open("frontend/src/components/logistics/InventoryLedger.tsx", "w") as f:
    f.write(content)

