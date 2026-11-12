import React, { useState } from 'react';
import { Search, Phone, User, MapPin, FileText, ChevronRight, Users, Paperclip } from 'lucide-react';
import { Party } from '../../types';
import { MediaPreviewModal } from '../common/MediaPreviewModal';

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
  const [previewMedia, setPreviewMedia] = useState<{
    title: string;
    url: string;
    fileName?: string;
    fileType?: string;
  } | null>(null);

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
                  {/* Small circular thumbnail next to customer name, or default profile icon */}
                  {party.photoUrl ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewMedia({
                          title: `${party.name} — Customer Photo`,
                          url: party.photoUrl!,
                          fileName: party.documentName || `${party.name}-photo.jpg`,
                          fileType: party.documentType || 'image/jpeg',
                        });
                      }}
                      title="Click to view full customer photo"
                      className="rounded-full overflow-hidden shrink-0 border-2 border-slate-200 hover:border-accent-500 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 cursor-zoom-in"
                    >
                      <img
                        src={party.photoUrl}
                        alt={party.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-brand-950 truncate">{party.name}</h4>
                      {party.documentUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewMedia({
                              title: `${party.name} — Customer Document`,
                              url: party.documentUrl!,
                              fileName: party.documentName || 'customer-document.pdf',
                              fileType: party.documentType || 'application/pdf',
                            });
                          }}
                          title="Click to view uploaded document"
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 text-accent-700 text-[10px] font-semibold border border-blue-200 shrink-0 cursor-pointer"
                        >
                          <Paperclip className="w-2.5 h-2.5" />
                          <span>Doc</span>
                        </button>
                      )}
                    </div>
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

      <MediaPreviewModal
        isOpen={!!previewMedia}
        title={previewMedia?.title || ''}
        url={previewMedia?.url}
        fileName={previewMedia?.fileName}
        fileType={previewMedia?.fileType}
        onClose={() => setPreviewMedia(null)}
      />
    </div>
  );
};
