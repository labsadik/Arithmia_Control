import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// 1. Type definition matching your database schema
export type Profile = {
  id: string;
  name: string | null;
  position: string | null;
  email: string | null;
  bio: string | null;
  website: string | null;
  avatar_url: string | null;
  media_url: string | null;
  created_at: string | null;
};

// 2. Route Definition with SEO Title "Arithmia"
export const Route = createFileRoute('/emplys')({
  component: EmployeesBoardPage,
  head: () => ({
    meta: [
      { title: "Arithmia - Employee Directory" },
      { name: "description", content: "Manage and view all employee profiles in Arithmia." },
    ],
  }),
});

// 3. The Component
function EmployeesBoardPage() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for the modal popup
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setEmployees(data as Profile[] || []);
      } catch (err: any) {
        console.error("Error fetching employees:", err);
        setError(err.message || "Failed to load employee data.");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full p-6 bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-4"></div>
        <p className="text-gray-500">Loading employee directory...</p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full p-6 bg-gray-50">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
          <p className="font-semibold">Error loading data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full w-full overflow-auto bg-gray-50">
      <div className="mb-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Arithmia Employee Directory</h1>
        <p className="text-sm text-gray-500 mt-1">Click on any profile to view full details.</p>
      </div>
      
      {employees.length === 0 ? (
        <div className="text-center py-12 rounded-xl bg-white border border-gray-200 shadow-sm max-w-6xl mx-auto">
          <p className="text-gray-400">No employees found in the database.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden max-w-6xl mx-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Website</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Bio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((emp) => (
                <tr 
                  key={emp.id} 
                  onClick={() => setSelectedEmployee(emp)} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 mr-3 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center border border-gray-200">
                        {emp.avatar_url ? (
                          <img src={emp.avatar_url || ''} alt={emp.name || 'Avatar'} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-gray-400">
                            {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {emp.name || 'Unnamed'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {emp.position || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {emp.email || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {emp.website ? (
                      <span className="text-gray-900 inline-flex items-center font-medium hover:underline">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-0L10 14"></path></svg>
                        Visit
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={emp.bio || ''}>
                    {emp.bio || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. PREMIUM MONOCHROME PROFILE MODAL */}
      {selectedEmployee && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedEmployee(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button (Glassmorphism Gray) */}
            <button 
              onClick={() => setSelectedEmployee(null)}
              className="absolute top-4 right-4 z-20 bg-white/70 backdrop-blur-md hover:bg-white text-gray-700 p-2 rounded-full transition-all border border-gray-200 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            {/* White & Gray Banner Section */}
            <div className="h-52 w-full bg-gradient-to-br from-gray-100 to-gray-300 relative rounded-t-2xl border-b border-gray-200">
              {selectedEmployee.media_url ? (
                <img src={selectedEmployee.media_url} alt="Cover" className="w-full h-full object-cover rounded-t-2xl opacity-90" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-300 rounded-t-2xl"></div>
              )}
            </div>

            {/* Profile Header (Avatar + Name + Actions) */}
            <div className="px-8 pb-6 border-b border-gray-100 flex flex-col sm:flex-row items-center sm:items-end gap-4 relative">
              
              {/* Profile Picture */}
              <div className="absolute -top-16 left-8">
                <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-100 overflow-hidden flex items-center justify-center shadow-xl ring-1 ring-gray-200">
                  {selectedEmployee.avatar_url ? (
                    <img src={selectedEmployee.avatar_url} alt={selectedEmployee.name || 'Avatar'} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-gray-400">
                      {selectedEmployee.name ? selectedEmployee.name.charAt(0).toUpperCase() : '?'}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Name and Action Buttons */}
              <div className="mt-16 sm:mt-0 sm:ml-36 flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{selectedEmployee.name || 'Unnamed'}</h2>
                <p className="text-sm font-medium text-gray-500">{selectedEmployee.position || 'No position set'}</p>
              </div>

              {/* Premium Dark Gray Action Buttons */}
              <div className="flex gap-2 mt-2 sm:mt-0">
                {selectedEmployee.email && (
                  <a 
                    href={`mailto:${selectedEmployee.email}`} 
                    className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors inline-flex items-center gap-2 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    Message
                  </a>
                )}
                {selectedEmployee.website && (
                  <a 
                    href={selectedEmployee.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors inline-flex items-center gap-2 border border-gray-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"></path></svg>
                    Website
                  </a>
                )}
              </div>
            </div>

            {/* Body / About Section */}
            <div className="p-8 space-y-6 bg-white">
              {/* Bio */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">About</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{selectedEmployee.bio || 'No bio provided.'}</p>
              </div>

              {/* Contact Info List */}
              <div className="border-t border-gray-100 pt-6 space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contact Info</h3>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <span className="text-gray-600 font-medium">{selectedEmployee.email || 'No email provided'}</span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-2 8h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <span className="text-gray-600 font-medium">{selectedEmployee.position || 'No position provided'}</span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  </div>
                  <span className="text-gray-600 font-medium">Joined on {selectedEmployee.created_at ? new Date(selectedEmployee.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}