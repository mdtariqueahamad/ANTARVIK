import React, { useState } from 'react';
import { Users, MapPin, Activity, Shield, User } from 'lucide-react';
import { useStationStore } from '../hooks/useStationStore';

const mockPersonnel = [
  { id: 1, name: 'Rahul Sharma', role: 'General Operator', location: 'Main Station', floor: 'Ground Floor', status: 'Active' },
  { id: 2, name: 'Amit Kumar', role: 'Generator Operator', location: 'Generator Room', floor: 'Ground Floor', status: 'Active' },
  { id: 3, name: 'Neha Singh', role: 'Scientist', location: 'Laboratory', floor: '1st Floor', status: 'Busy' },
  { id: 4, name: 'Priya Patel', role: 'Logistics Manager', location: 'Warehouse A', floor: 'Ground Floor', status: 'Active' },
  { id: 5, name: 'Vikram Reddy', role: 'Medical Officer', location: 'Medical Bay', floor: '1st Floor', status: 'Standby' },
  { id: 6, name: 'Sarah Jones', role: 'Visiting Researcher', location: 'Ice Core Storage', floor: 'Basement', status: 'Active' },
  { id: 7, name: 'Arjun Nair', role: 'Station Commander', location: 'Command Center', floor: '2nd Floor', status: 'Busy' }
];

export default function Personnel() {
  const { selectedStation } = useStationStore();
  const [search, setSearch] = useState('');

  const filtered = mockPersonnel.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.role.toLowerCase().includes(search.toLowerCase()) ||
    p.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Users className="w-6 h-6 text-purple-400" />
            Personnel Management
          </h2>
          <p className="text-white/50 text-sm mt-1">Live tracking and roster for {selectedStation.toUpperCase()}</p>
        </div>
      </header>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-400" /> Station Roster & Locations
          </h3>
          <input 
            type="text" 
            placeholder="Search personnel..." 
            className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-white/50 uppercase tracking-widest text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Personnel</th>
                <th className="px-4 py-3">Role/Designation</th>
                <th className="px-4 py-3">Current Location</th>
                <th className="px-4 py-3">Station/Floor</th>
                <th className="px-4 py-3 rounded-tr-lg">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(person => (
                <tr key={person.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-white flex items-center gap-3">
                    <div className="bg-purple-500/20 p-2 rounded-full border border-purple-500/30">
                      <User className="w-4 h-4 text-purple-300" />
                    </div>
                    {person.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-black/30 border border-white/10 px-2.5 py-1 rounded-md text-xs">
                      {person.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-purple-200">{person.location}</td>
                  <td className="px-4 py-3 text-white/50">{selectedStation.toUpperCase()} — {person.floor}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      person.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                      person.status === 'Busy' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {person.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-white/40 text-sm">No personnel found matching search criteria.</div>
          )}
        </div>
      </div>
    </div>
  );
}
