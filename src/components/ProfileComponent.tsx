"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Globe, Mail, RefreshCw, Search, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Exact Profile interface matching your DB table
export interface Profile {
  id: string;
  name: string | null;
  position: string | null;
  email: string | null;
  bio: string | null;
  website: string | null;
  avatar_url: string | null;
  media_url: string | null;
  created_at: string | null;
}

// =========================================================================
// Profile Modal Popup Component
// =========================================================================
function ProfileModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close profile"
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
        {/* Header / Cover Media */}
        <div className="relative h-44 bg-gray-100">
          {profile.media_url ? (
            <img src={profile.media_url} alt="Cover media" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-blue-50 to-indigo-50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 max-h-[70vh] overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-24 sm:-mt-20 mb-8">
            {/* Avatar perfectly overlapping the banner */}
            <div className="flex shrink-0 items-center justify-center rounded-3xl border-4 border-white bg-white shadow-lg size-32 overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name || "User"} className="size-full object-cover" />
              ) : (
                <div className="size-full rounded-2xl flex items-center justify-center bg-gray-50">
                  <User className="size-10 text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Name & Position */}
            <div className="flex-1 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{profile.name || "Unknown User"}</h2>
              <p className="text-sm font-medium text-blue-600 mt-1">{profile.position || "No position specified"}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50/50">
              <Mail className="size-5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900 truncate">{profile.email || "Not provided"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50/50">
              <Briefcase className="size-5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Position</p>
                <p className="text-sm font-medium text-gray-900 truncate">{profile.position || "Not provided"}</p>
              </div>
            </div>

            {profile.website && (
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 sm:col-span-2">
                <Globe className="size-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Website</p>
                  <a href={`https://${profile.website}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate">
                    {profile.website}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Bio Log / Details */}
          {profile.bio && (
            <div className="mt-4 p-5 rounded-2xl border border-gray-100 bg-white">
              <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-2">Biography</p>
              <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// Main Profile Component
// =========================================================================
export function ProfileComponent() {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all users from the database
  const {
    data: profiles = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetch error:", error.message);
        throw error;
      }

      return data ?? [];
    },
  });

  // Filter profiles based on search query
  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return profiles;
    return profiles.filter(profile => 
      profile.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [profiles, searchQuery]);

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Team Profiles</h1>
          <p className="text-sm text-gray-500 mt-1">Search and view employee data and details</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full sm:w-64 rounded-full border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <button 
            onClick={() => refetch()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-56 rounded-2xl border border-gray-100 bg-white animate-pulse" />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p className="font-semibold">Error loading profiles.</p>
          <p className="mt-1 text-xs">
            {error instanceof Error ? error.message : "Check browser console for details. Ensure the table exists and RLS policies are enabled in Supabase."}
          </p>
        </div>
      )}

      {/* Profile Grid & Table */}
      {!isLoading && !isError && (
        <>
          {/* Grid View */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => setSelectedProfile(profile)}
                className={cn(
                  "cursor-pointer group relative overflow-hidden rounded-2xl",
                  "border border-gray-100 bg-white shadow-sm",
                  "transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-blue-200"
                )}
              >
                {/* Cover Media */}
                <div className="relative h-28 bg-gray-100 overflow-hidden">
                  {profile.media_url ? (
                    <img src={profile.media_url} alt="Cover" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-r from-blue-50 to-indigo-50" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                </div>

                {/* Profile Info */}
                <div className="relative px-5 pb-5 pt-0">
                  {/* Avatar perfectly overlapping the cover banner */}
                  <div className="absolute -top-10 left-5 flex size-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.name || "User"} className="size-full object-cover" />
                    ) : (
                      <User className="size-8 text-gray-400" />
                    )}
                  </div>

                  {/* Name & Position */}
                  <div className="mt-12">
                    <p className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {profile.name || "Unknown User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {profile.position || "No position"}
                    </p>
                  </div>

                  {/* Email */}
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-500 border-t border-gray-100 pt-3">
                    <Mail className="size-3 text-gray-400" />
                    <span className="truncate">{profile.email || "No email"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* User List Table */}
          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">All Users Directory</h2>
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left font-medium text-gray-500">Employee</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-500 hidden md:table-cell">Position</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-500 hidden lg:table-cell">Email</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-500 hidden sm:table-cell">Website</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProfiles.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                          No users found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredProfiles.map((profile) => (
                        <tr 
                          key={profile.id} 
                          onClick={() => setSelectedProfile(profile)}
                          className="cursor-pointer hover:bg-blue-50/30 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-xl overflow-hidden border border-gray-100 bg-gray-100 flex items-center justify-center shrink-0">
                                {profile.avatar_url ? (
                                  <img src={profile.avatar_url} alt={profile.name || "User"} className="size-full object-cover" />
                                ) : (
                                  <User className="size-5 text-gray-400" />
                                )}
                              </div>
                              <span className="font-medium text-gray-900">{profile.name || "Unknown User"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 hidden md:table-cell">{profile.position || "No position"}</td>
                          <td className="px-6 py-4 text-gray-500 hidden lg:table-cell">{profile.email || "No email"}</td>
                          <td className="px-6 py-4 text-gray-500 hidden sm:table-cell truncate">{profile.website || "N/A"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Popup Modal */}
      {selectedProfile && (
        <ProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}