import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [eventStatistics, setEventStatistics] = useState(null);
  const [people, setPeople] = useState([]);
  const [responses, setResponses] = useState([]);

  // Create event form
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    calamity_type: 'flood'
  });

  // Add person form
  const [personForm, setPersonForm] = useState({
    name: '',
    contact: '',
    tags: []
  });

  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchEventDetails();
      const interval = setInterval(fetchEventDetails, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/events`);
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchEventDetails = async () => {
    if (!selectedEvent) return;

    try {
      const [peopleRes, statsRes, responsesRes] = await Promise.all([
        fetch(`${API_URL}/api/events/${selectedEvent}/people`),
        fetch(`${API_URL}/api/events/${selectedEvent}/statistics`),
        fetch(`${API_URL}/api/events/${selectedEvent}/responses`)
      ]);

      const peopleData = await peopleRes.json();
      const statsData = await statsRes.json();
      const responsesData = await responsesRes.json();

      setPeople(peopleData);
      setEventStatistics(statsData);
      setResponses(responsesData);
    } catch (error) {
      console.error('Error fetching event details:', error);
    }
  };

  const createEvent = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventForm),
      });

      if (response.ok) {
        setShowCreateEvent(false);
        setEventForm({ title: '', description: '', calamity_type: 'flood' });
        fetchEvents();
      }
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const addPerson = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/events/${selectedEvent}/people`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(personForm),
      });

      if (response.ok) {
        setShowAddPerson(false);
        setPersonForm({ name: '', contact: '', tags: [] });
        fetchEventDetails();
      }
    } catch (error) {
      console.error('Error adding person:', error);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !personForm.tags.includes(newTag.trim())) {
      setPersonForm({
        ...personForm,
        tags: [...personForm.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setPersonForm({
      ...personForm,
      tags: personForm.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const generateShareLink = async () => {
    try {
      const response = await fetch(`${API_URL}/api/events/${selectedEvent}/share`);
      const data = await response.json();
      const fullUrl = `${window.location.origin}/respond/${selectedEvent}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(fullUrl);
      alert('Share link copied to clipboard!');
    } catch (error) {
      console.error('Error generating share link:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'safe': return 'text-green-600';
      case 'need_help': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'safe': return '✓';
      case 'need_help': return '⚠';
      default: return '?';
    }
  };

  const getPersonStatus = (personId) => {
    const response = responses.find(r => r.person_id === personId);
    return response ? response.status : 'no_response';
  };

  const getPersonResponse = (personId) => {
    return responses.find(r => r.person_id === personId);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">People Monitor</h1>
          <p className="text-gray-600">Emergency Response & Safety Tracking</p>
        </header>

        {!selectedEvent ? (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Active Events</h2>
              <button
                onClick={() => setShowCreateEvent(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
              >
                Create New Event
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedEvent(event.id)}
                >
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{event.title}</h3>
                  <p className="text-gray-600 mb-3">{event.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">
                      {event.calamity_type}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(event.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {events.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No active events</p>
                <p className="text-gray-400">Create your first calamity monitoring event</p>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-blue-500 hover:text-blue-700 flex items-center"
              >
                ← Back to Events
              </button>
              <div className="flex gap-2">
                <button
                  onClick={generateShareLink}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                >
                  Share Link
                </button>
                <button
                  onClick={() => setShowAddPerson(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Add Person
                </button>
              </div>
            </div>

            {eventStatistics && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Event Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{eventStatistics.total_people}</div>
                    <div className="text-sm text-gray-600">Total People</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{eventStatistics.safe_count}</div>
                    <div className="text-sm text-gray-600">Safe</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{eventStatistics.need_help_count}</div>
                    <div className="text-sm text-gray-600">Need Help</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{eventStatistics.no_response_count}</div>
                    <div className="text-sm text-gray-600">No Response</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    {eventStatistics.response_rate.toFixed(1)}% Response Rate
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">People Status</h3>
              <div className="space-y-4">
                {people.map((person) => {
                  const status = getPersonStatus(person.id);
                  const response = getPersonResponse(person.id);
                  return (
                    <div key={person.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                          </span>
                          <div>
                            <h4 className="font-medium text-gray-800">{person.name}</h4>
                            <p className="text-sm text-gray-600">{person.contact}</p>
                          </div>
                        </div>
                        {person.tags.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {person.tags.map((tag) => (
                              <span key={tag} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${getStatusColor(status)}`}>
                          {status === 'safe' ? 'Safe' : 
                           status === 'need_help' ? 'Need Help' : 'No Response'}
                        </div>
                        {response && (
                          <div className="text-sm text-gray-500">
                            {new Date(response.response_time).toLocaleString()}
                          </div>
                        )}
                        {response && response.message && (
                          <div className="text-sm text-gray-600 mt-1 italic">
                            "{response.message}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Create Event Modal */}
        {showCreateEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Create New Event</h3>
              <form onSubmit={createEvent}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Title</label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows="3"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Calamity Type</label>
                  <select
                    value={eventForm.calamity_type}
                    onChange={(e) => setEventForm({...eventForm, calamity_type: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="flood">Flood</option>
                    <option value="typhoon">Typhoon</option>
                    <option value="storm">Storm</option>
                    <option value="earthquake">Earthquake</option>
                    <option value="fire">Fire</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Create Event
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateEvent(false)}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Person Modal */}
        {showAddPerson && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Add Person to Monitor</h3>
              <form onSubmit={addPerson}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={personForm.name}
                    onChange={(e) => setPersonForm({...personForm, name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
                  <input
                    type="text"
                    value={personForm.contact}
                    onChange={(e) => setPersonForm({...personForm, contact: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Phone, Email, or other contact info"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags/Teams</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-md"
                      placeholder="Add tag (e.g., IT Team, Floor 3)"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {personForm.tags.map((tag) => (
                      <span key={tag} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Add Person
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddPerson(false)}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;