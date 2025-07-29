import React, { useState, useEffect } from 'react';
import './App.css';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from './components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Edit, Trash2, Copy, Share, Plus, Upload, UserPlus, MoreHorizontal } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [showDuplicateEvent, setShowDuplicateEvent] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showEditPerson, setShowEditPerson] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [eventStatistics, setEventStatistics] = useState(null);
  const [people, setPeople] = useState([]);
  const [responses, setResponses] = useState([]);
  const [editingPerson, setEditingPerson] = useState(null);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [deleteEventId, setDeleteEventId] = useState(null);

  // Auth form
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: ''
  });

  // Create event form
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    calamity_type: 'flood'
  });

  // Edit event form
  const [editEventForm, setEditEventForm] = useState({
    title: '',
    description: '',
    calamity_type: 'flood'
  });

  // Duplicate event form
  const [duplicateEventForm, setDuplicateEventForm] = useState({
    title: '',
    description: ''
  });

  // Add person form
  const [personForm, setPersonForm] = useState({
    name: '',
    contact: '',
    tags: []
  });

  // Edit person form
  const [editPersonForm, setEditPersonForm] = useState({
    name: '',
    contact: '',
    tags: []
  });

  const [newTag, setNewTag] = useState('');
  const [editNewTag, setEditNewTag] = useState('');
  const [bulkData, setBulkData] = useState('');
  const [bulkResult, setBulkResult] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [excelResult, setExcelResult] = useState(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [bulkMethod, setBulkMethod] = useState('text'); // 'text' or 'excel'

  // Check authentication on app load
  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedEvent && isAuthenticated) {
      fetchEventDetails();
      const interval = setInterval(fetchEventDetails, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [selectedEvent, isAuthenticated]);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      localStorage.removeItem('token');
    }
    setLoading(false);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin ? 
      { email: authForm.email, password: authForm.password } :
      { email: authForm.email, password: authForm.password, name: authForm.name };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        setShowAuth(false);
        setAuthForm({ email: '', password: '', name: '' });
        await checkAuth();
      } else {
        const error = await response.json();
        alert(error.detail || 'Authentication failed');
      }
    } catch (error) {
      console.error('Error during auth:', error);
      alert('Authentication failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    setEvents([]);
    setSelectedEvent(null);
  };

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/events`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchEventDetails = async () => {
    if (!selectedEvent) return;

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };

      const [eventRes, peopleRes, statsRes, responsesRes] = await Promise.all([
        fetch(`${API_URL}/api/events/${selectedEvent}`, { headers }),
        fetch(`${API_URL}/api/events/${selectedEvent}/people`, { headers }),
        fetch(`${API_URL}/api/events/${selectedEvent}/statistics`, { headers }),
        fetch(`${API_URL}/api/events/${selectedEvent}/responses`, { headers })
      ]);

      if (eventRes.ok && peopleRes.ok && statsRes.ok && responsesRes.ok) {
        const eventData = await eventRes.json();
        const peopleData = await peopleRes.json();
        const statsData = await statsRes.json();
        const responsesData = await responsesRes.json();

        setCurrentEvent(eventData);
        setPeople(peopleData);
        setEventStatistics(statsData);
        setResponses(responsesData);
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
    }
  };

  const createEvent = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

  const updateEvent = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/events/${selectedEvent}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editEventForm),
      });

      if (response.ok) {
        setShowEditEvent(false);
        setEditEventForm({ title: '', description: '', calamity_type: 'flood' });
        fetchEvents();
        fetchEventDetails();
      }
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const deleteEvent = async () => {
    if (!deleteEventId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/events/${deleteEventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // If we're currently viewing the deleted event, go back to events list
        if (selectedEvent === deleteEventId) {
          setSelectedEvent(null);
        }
        setDeleteEventId(null);
        fetchEvents();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const duplicateEvent = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/events/${selectedEvent}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(duplicateEventForm),
      });

      if (response.ok) {
        setShowDuplicateEvent(false);
        setDuplicateEventForm({ title: '', description: '' });
        fetchEvents();
        alert('Event duplicated successfully!');
      }
    } catch (error) {
      console.error('Error duplicating event:', error);
    }
  };

  const addPerson = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/events/${selectedEvent}/people`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

  const updatePerson = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/events/${selectedEvent}/people/${editingPerson.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editPersonForm),
      });

      if (response.ok) {
        setShowEditPerson(false);
        setEditingPerson(null);
        setEditPersonForm({ name: '', contact: '', tags: [] });
        fetchEventDetails();
      }
    } catch (error) {
      console.error('Error updating person:', error);
    }
  };

  const deletePerson = async (personId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/events/${selectedEvent}/people/${personId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchEventDetails();
      }
    } catch (error) {
      console.error('Error deleting person:', error);
    }
  };

  const openEditPerson = (person) => {
    setEditingPerson(person);
    setEditPersonForm({
      name: person.name,
      contact: person.contact,
      tags: [...person.tags]
    });
    setShowEditPerson(true);
  };

  const openEditEvent = () => {
    if (currentEvent) {
      setEditEventForm({
        title: currentEvent.title,
        description: currentEvent.description,
        calamity_type: currentEvent.calamity_type
      });
      setShowEditEvent(true);
    }
  };

  const openDuplicateEvent = () => {
    if (currentEvent) {
      setDuplicateEventForm({
        title: `Copy of ${currentEvent.title}`,
        description: currentEvent.description
      });
      setShowDuplicateEvent(true);
    }
  };

  const handleBulkAdd = async (e) => {
    e.preventDefault();
    setBulkResult(null);
    setExcelResult(null);
    
    if (bulkMethod === 'text') {
      await bulkAddPeople();
    } else {
      await uploadExcelFile();
    }
  };

  const bulkAddPeople = async () => {
    try {
      // Parse the bulk data
      const lines = bulkData.trim().split('\n').filter(line => line.trim());
      const people = [];
      
      for (const line of lines) {
        const parts = line.split(',').map(part => part.trim());
        if (parts.length >= 2) {
          const person = {
            name: parts[0],
            contact: parts[1],
            tags: parts.slice(2).filter(tag => tag.length > 0)
          };
          people.push(person);
        }
      }
      
      if (people.length === 0) {
        alert('No valid people data found. Please check the format.');
        return;
      }
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/events/${selectedEvent}/people/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ people }),
      });

      if (response.ok) {
        const result = await response.json();
        setBulkResult(result);
        if (result.added_count > 0) {
          setBulkData('');
          fetchEventDetails();
        }
      } else {
        const error = await response.json();
        alert(error.detail || 'Error adding people');
      }
    } catch (error) {
      console.error('Error bulk adding people:', error);
      alert('Error processing bulk data');
    }
  };

  const uploadExcelFile = async () => {
    if (!excelFile) {
      alert('Please select an Excel file');
      return;
    }

    setUploadingExcel(true);

    try {
      const formData = new FormData();
      formData.append('file', excelFile);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/events/${selectedEvent}/people/bulk/excel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setExcelResult(result);
        if (result.added_count > 0) {
          setExcelFile(null);
          fetchEventDetails();
        }
      } else {
        const error = await response.json();
        alert(error.detail || 'Error uploading Excel file');
      }
    } catch (error) {
      console.error('Error uploading Excel file:', error);
      alert('Error uploading Excel file');
    } finally {
      setUploadingExcel(false);
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

  const addEditTag = () => {
    if (editNewTag.trim() && !editPersonForm.tags.includes(editNewTag.trim())) {
      setEditPersonForm({
        ...editPersonForm,
        tags: [...editPersonForm.tags, editNewTag.trim()]
      });
      setEditNewTag('');
    }
  };

  const removeEditTag = (tagToRemove) => {
    setEditPersonForm({
      ...editPersonForm,
      tags: editPersonForm.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const generateShareLink = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/events/${selectedEvent}/share`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const fullUrl = `${API_URL}/api/respond/${selectedEvent}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(fullUrl);
        alert('Share link copied to clipboard!');
      }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="loading mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-card rounded-lg shadow-lg p-8 border">
            <h1 className="text-3xl font-bold text-center text-foreground mb-2">People Monitor</h1>
            <p className="text-center text-muted-foreground mb-8">Emergency Response & Safety Tracking</p>
            
            <div className="text-center mb-6">
              <Button
                onClick={() => setShowAuth(true)}
                size="lg"
                className="w-full"
              >
                Get Started
              </Button>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>Secure admin access for emergency response coordination</p>
            </div>
          </div>
        </div>

        {/* Auth Modal */}
        <Dialog open={showAuth} onOpenChange={setShowAuth}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{isLogin ? 'Login' : 'Register'}</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                    className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                  required
                />
              </div>
              
              <DialogFooter className="space-y-2">
                <Button type="submit" className="w-full">
                  {isLogin ? 'Login' : 'Register'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsLogin(!isLogin)}
                  className="w-full"
                >
                  {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold text-foreground">People Monitor</h1>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">Welcome, {user?.name}</span>
              <Button variant="ghost" onClick={logout} className="text-destructive">
                Logout
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">Emergency Response & Safety Tracking</p>
        </header>

        {!selectedEvent ? (
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Your Events</h2>
              <Button onClick={() => setShowCreateEvent(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Event
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-card rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border relative group"
                  onClick={() => setSelectedEvent(event.id)}
                >
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteEventId(event.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Event</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{event.title}"? This action cannot be undone and will remove all associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={deleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-card-foreground mb-2">{event.title}</h3>
                  <p className="text-muted-foreground mb-4">{event.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="bg-destructive/10 text-destructive px-3 py-1 rounded-full text-sm font-medium">
                      {event.calamity_type}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(event.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {events.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No events created yet</p>
                <p className="text-muted-foreground">Create your first calamity monitoring event</p>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <Button variant="ghost" onClick={() => setSelectedEvent(null)} className="text-primary">
                ← Back to Events
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={openEditEvent}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" onClick={openDuplicateEvent}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </Button>
                <Button variant="outline" onClick={generateShareLink}>
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" onClick={() => setShowAddPerson(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Person
                </Button>
                <Button onClick={() => setShowBulkAdd(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Add
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteEventId(selectedEvent)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Event
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Event</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{currentEvent?.title}"? This action cannot be undone and will remove all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Event Title Header */}
            {currentEvent && (
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-foreground mb-2">{currentEvent.title}</h2>
                <p className="text-muted-foreground mb-1">{currentEvent.description}</p>
                <div className="flex items-center gap-4">
                  <span className="bg-destructive/10 text-destructive px-3 py-1 rounded-full text-sm font-medium">
                    {currentEvent.calamity_type}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Created: {new Date(currentEvent.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}

            {eventStatistics && (
              <div className="bg-card rounded-lg shadow-md p-6 mb-6 border">
                <h3 className="text-xl font-semibold text-card-foreground mb-4">Event Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{eventStatistics.total_people}</div>
                    <div className="text-sm text-muted-foreground">Total People</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{eventStatistics.safe_count}</div>
                    <div className="text-sm text-muted-foreground">Safe</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{eventStatistics.need_help_count}</div>
                    <div className="text-sm text-muted-foreground">Need Help</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-muted-foreground">{eventStatistics.no_response_count}</div>
                    <div className="text-sm text-muted-foreground">No Response</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-primary">
                    {eventStatistics.response_rate.toFixed(1)}% Response Rate
                  </div>
                </div>
              </div>
            )}

            <div className="bg-card rounded-lg shadow-md p-6 border">
              <h3 className="text-xl font-semibold text-card-foreground mb-4">People Status</h3>
              <div className="space-y-4">
                {people.map((person) => {
                  const status = getPersonStatus(person.id);
                  const response = getPersonResponse(person.id);
                  return (
                    <div key={person.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                          </span>
                          <div>
                            <h4 className="font-medium text-card-foreground">{person.name}</h4>
                            <p className="text-sm text-muted-foreground">{person.contact}</p>
                          </div>
                        </div>
                        {person.tags.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {person.tags.map((tag) => (
                              <span key={tag} className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`font-medium ${getStatusColor(status)}`}>
                            {status === 'safe' ? 'Safe' : 
                             status === 'need_help' ? 'Need Help' : 'No Response'}
                          </div>
                          {response && (
                            <div className="text-sm text-muted-foreground">
                              {new Date(response.response_time).toLocaleString()}
                            </div>
                          )}
                          {response && response.message && (
                            <div className="text-sm text-muted-foreground mt-1 italic">
                              "{response.message}"
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditPerson(person)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Person</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {person.name} from this event?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deletePerson(person.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Create Event Modal */}
        <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={createEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Event Title</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                  rows="3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Calamity Type</label>
                <select
                  value={eventForm.calamity_type}
                  onChange={(e) => setEventForm({...eventForm, calamity_type: e.target.value})}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="flood">Flood</option>
                  <option value="typhoon">Typhoon</option>
                  <option value="storm">Storm</option>
                  <option value="earthquake">Earthquake</option>
                  <option value="fire">Fire</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="submit">Create Event</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Event Modal */}
        <Dialog open={showEditEvent} onOpenChange={setShowEditEvent}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={updateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Event Title</label>
                <input
                  type="text"
                  value={editEventForm.title}
                  onChange={(e) => setEditEventForm({...editEventForm, title: e.target.value})}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea
                  value={editEventForm.description}
                  onChange={(e) => setEditEventForm({...editEventForm, description: e.target.value})}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                  rows="3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Calamity Type</label>
                <select
                  value={editEventForm.calamity_type}
                  onChange={(e) => setEditEventForm({...editEventForm, calamity_type: e.target.value})}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="flood">Flood</option>
                  <option value="typhoon">Typhoon</option>
                  <option value="storm">Storm</option>
                  <option value="earthquake">Earthquake</option>
                  <option value="fire">Fire</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="submit">Update Event</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Duplicate Event Modal */}
        <Dialog open={showDuplicateEvent} onOpenChange={setShowDuplicateEvent}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Duplicate Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={duplicateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">New Event Title</label>
                <input
                  type="text"
                  value={duplicateEventForm.title}
                  onChange={(e) => setDuplicateEventForm({...duplicateEventForm, title: e.target.value})}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">New Description</label>
                <textarea
                  value={duplicateEventForm.description}
                  onChange={(e) => setDuplicateEventForm({...duplicateEventForm, description: e.target.value})}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                  rows="3"
                  required
                />
              </div>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  This will create a new event with the same calamity type and all the people from the current event.
                </p>
              </div>
              <DialogFooter>
                <Button type="submit">Duplicate Event</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Person Modal */}
        <Dialog open={showAddPerson} onOpenChange={setShowAddPerson}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Person to Monitor</DialogTitle>
            </DialogHeader>
            <form onSubmit={addPerson} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <input
                  type="text"
                  value={personForm.name}
                  onChange={(e) => setPersonForm({...personForm, name: e.target.value})}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact</label>
                <input
                  type="text"
                  value={personForm.contact}
                  onChange={(e) => setPersonForm({...personForm, contact: e.target.value})}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                  placeholder="Phone, Email, or other contact info"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tags/Teams</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="flex-1 p-3 border border-input rounded-md bg-background text-foreground"
                    placeholder="Add tag (e.g., IT Team, Floor 3)"
                  />
                  <Button type="button" onClick={addTag}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {personForm.tags.map((tag) => (
                    <span key={tag} className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-primary hover:text-primary/80"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Person</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Person Modal */}
        <Dialog open={showEditPerson} onOpenChange={setShowEditPerson}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Person</DialogTitle>
            </DialogHeader>
            <form onSubmit={updatePerson} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <input
                  type="text"
                  value={editPersonForm.name}
                  onChange={(e) => setEditPersonForm({...editPersonForm, name: e.target.value})}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact</label>
                <input
                  type="text"
                  value={editPersonForm.contact}
                  onChange={(e) => setEditPersonForm({...editPersonForm, contact: e.target.value})}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                  placeholder="Phone, Email, or other contact info"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tags/Teams</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={editNewTag}
                    onChange={(e) => setEditNewTag(e.target.value)}
                    className="flex-1 p-3 border border-input rounded-md bg-background text-foreground"
                    placeholder="Add tag (e.g., IT Team, Floor 3)"
                  />
                  <Button type="button" onClick={addEditTag}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editPersonForm.tags.map((tag) => (
                    <span key={tag} className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeEditTag(tag)}
                        className="text-primary hover:text-primary/80"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Update Person</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bulk Add People Modal */}
        <Dialog open={showBulkAdd} onOpenChange={setShowBulkAdd}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Add People</DialogTitle>
            </DialogHeader>
            
            <Tabs value={bulkMethod} onValueChange={setBulkMethod}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">Text Input</TabsTrigger>
                <TabsTrigger value="excel">Excel Upload</TabsTrigger>
              </TabsList>
              
              <TabsContent value="text">
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">Instructions:</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Enter one person per line in the format: <strong>Name, Contact, Tag1, Tag2, ...</strong>
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">Example:</p>
                    <code className="text-xs text-foreground bg-background px-2 py-1 rounded">
                      John Doe, john@company.com, IT Team, Floor 3<br/>
                      Jane Smith, jane@company.com, HR Team, Floor 2<br/>
                      Mike Johnson, mike@company.com, IT Team
                    </code>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      People Data (one per line)
                    </label>
                    <textarea
                      value={bulkData}
                      onChange={(e) => setBulkData(e.target.value)}
                      className="w-full p-3 border border-input rounded-md h-40 font-mono text-sm bg-background text-foreground"
                      placeholder="John Doe, john@company.com, IT Team, Floor 3
Jane Smith, jane@company.com, HR Team, Floor 2
Mike Johnson, mike@company.com, IT Team"
                      required
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="excel">
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">Excel Format Requirements:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Required columns: <strong>Name</strong>, <strong>Contact</strong></li>
                      <li>• Optional columns: <strong>Tags</strong> (comma-separated) or <strong>Tag1</strong>, <strong>Tag2</strong>, etc.</li>
                      <li>• File must be .xlsx or .xls format</li>
                      <li>• First row should contain column headers</li>
                    </ul>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Select Excel File
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setExcelFile(e.target.files[0])}
                      className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                      required
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            {(bulkResult || excelResult) && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Result:</h4>
                <p className="text-sm text-green-600 mb-1">
                  ✅ Successfully added: {(bulkResult?.added_count || excelResult?.added_count) || 0} people
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  Total {bulkResult ? 'requested' : 'rows'}: {(bulkResult?.total_requested || excelResult?.total_rows) || 0}
                </p>
                {((bulkResult?.errors && bulkResult.errors.length > 0) || (excelResult?.errors && excelResult.errors.length > 0)) && (
                  <div>
                    <p className="text-sm text-red-600 mb-1">❌ Errors:</p>
                    <ul className="text-xs text-red-500 ml-4 max-h-32 overflow-y-auto">
                      {(bulkResult?.errors || excelResult?.errors || []).map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button 
                onClick={handleBulkAdd}
                disabled={uploadingExcel || (bulkMethod === 'text' && !bulkData.trim()) || (bulkMethod === 'excel' && !excelFile)}
              >
                {uploadingExcel ? 'Processing...' : 'Add People'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default App;