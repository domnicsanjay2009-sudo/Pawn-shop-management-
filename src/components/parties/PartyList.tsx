import React, { useState } from 'react';
import { Search, Phone, User, MapPin, FileText, ChevronRight, Users } from 'lucide-react';
import { Party } from '../../types';

interface PartyListProps {
  parties: Party[];
  onSelectParty: (party: Party) => void;
  selectedPartyId?: string;
}

export const PartyList: React.FC<PartyListProps> = ({
  parties,
  onSelectParty,
  selectedPartyId,
}) => {
  const [viewMode, setViewMode] = useState<'recent' | 'all'>('recent');
  const [searchMode, setSearchMode] = useState<'name' | 'phone'>('name');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering logic
  const filteredParties = parties.filter((p) => {
    if (!searchQuery.trim()) return true;

    if (searchMode === 'name') {
      return p.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    } else {
      const cleanPhone = p.phone.replace(/\D/g, '');
      const cleanQuery = searchQuery.replace(/\D/g, '');
      return cleanPhone.includes(cleanQuery);
    }
  });

  // Sorting logic: recent vs A-Z
  const displayedParties = [...filteredParties].sort((a, b) => {
    if (viewMode === 'all') {
      return a.name.localeCompare(b.name);
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Header & View Controls */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-brand-950">Customer Directory</h3>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
            {displayedParties.length}
          </span>
        </div>

        {/* View Mode Toggle: Recent vs A-Z View All */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setViewMode('recent')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'recent'
                ? 'bg-white text-brand-950 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Recently Added
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'all'
                ? 'bg-white text-brand-950 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            View All (A–Z)
          </button>
        </div>
      </div>

      {/* Dual Search Modes: Search by Name / Search by Phone Number */}
      <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex rounded-xl bg-white border border-slate-200 p-0.5 text-xs font-medium shrink-0">
          <button
            onClick={() => {
              setSearchMode('name');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              searchMode === 'name' ? 'bg-brand-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Search by Name
          </button>
          <button
            onClick={() => {
              setSearchMode('phone');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              searchMode === 'phone' ? 'bg-brand-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Search by Phone
          </button>
        </div>

        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type={searchMode === 'phone' ? 'tel' : 'text'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchMode === 'name'
                ? 'Type customer name to search...'
                : 'Enter 10-digit phone number...'
            }
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
      </div>

      {/* Party Compact List */}
      <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
        {displayedParties.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-400">
            <User className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No customer records found</p>
            <p className="text-xs text-slate-400 mt-1">
              Add a new party above to create bills and track pledges
            </p>
          </div>
        ) : (
          displayedParties.map((party) => {
            const isSelected = selectedPartyId === party.id;
            return (
              <div
                key={party.id}
                onClick={() => onSelectParty(party)}
                className={`p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                  isSelected ? 'bg-accent-50/70 border-l-4 border-accent-600' : ''
                }`}
              >
                {/* Left: Photo / placeholder + Name & Contact */}
                <div className="flex items-center space-x-3.5 min-w-0">
                  {/* Photo or placeholder */}
                  {party.photoUrl ? (
                    <img
                      src={party.photoUrl}
                      alt={party.name}
                      className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-900 to-slate-800 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                      {party.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-brand-950 truncate">{party.name}</h4>
                    <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center space-x-1 shrink-0 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{party.phone}</span>
                      </span>
                      <span className="hidden sm:flex items-center space-x-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{party.address}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Total number of bills under that party & chevron */}
                <div className="flex items-center space-x-4 shrink-0 pl-3">
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                      <FileText className="w-3 h-3 mr-1 text-slate-500" />
                      {party.totalBills || 0} {party.totalBills === 1 ? 'Bill' : 'Bills'}
                    </span>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-accent-600' : 'text-slate-300'}`} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
