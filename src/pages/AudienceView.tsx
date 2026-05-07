import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { MessageSquare, Send, Users, Shield, Radio, Volume2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AudienceView() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // Fetch Event
    const fetchEvent = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'events', id));
        if (docSnap.exists()) {
          setEvent(docSnap.data());
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `events/${id}`);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();

    // Subscribe to Chat
    const q = query(
      collection(db, 'messages'),
      where('eventId', '==', id),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });
  }, [id]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !id) return;

    try {
      const path = 'messages';
      await addDoc(collection(db, path), {
        eventId: id,
        senderId: user.uid,
        senderName: user.displayName,
        senderPhoto: user.photoURL,
        text: newMessage,
        timestamp: new Date().toISOString(),
      });
      setNewMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'messages');
    }
  };

  if (loading) return <div className="h-[80vh] flex items-center justify-center">Loading Session...</div>;
  if (!event) return <div className="h-[80vh] flex items-center justify-center">Session not found.</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-140px)]">
      {/* Video / Main Content */}
      <div className="flex-1 flex flex-col gap-6 h-full">
        <div className="relative flex-1 bg-black rounded-[40px] overflow-hidden group">
          <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-red-500 px-4 py-1.5 rounded-full text-white text-xs font-bold uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Live Now
            </div>
            <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-white/10">
              <Users size={14} />
              1,245 Watching
            </div>
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center">
            {profile?.role === 'internal' || profile?.role === 'speaker' ? (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto backdrop-blur-md">
                  <Shield className="text-white" size={40} />
                </div>
                <h2 className="text-white text-3xl font-bold tracking-tight px-12">Expert View: Launch Google Meet to begin the live stream.</h2>
                <a 
                  href={event.googleMeetLink} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-block bg-white text-black px-10 py-4 rounded-full font-bold text-lg hover:bg-[#F27D26] hover:text-white transition-all shadow-xl"
                >
                  Join Google Meet
                </a>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto backdrop-blur-md animate-pulse">
                  <Radio className="text-white" size={48} />
                </div>
                <p className="text-white font-bold text-xl">The host is preparing the stream...</p>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">Please stay tuned. You'll automatically hear and see once the session goes live.</p>
              </div>
            )}
          </div>

          {/* Controls Overlay (Hidden partially) */}
          <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-4">
              <button className="bg-white/10 backdrop-blur-md p-3 rounded-full text-white border border-white/10">
                <Volume2 size={24} />
              </button>
            </div>
            <div className="text-white font-bold text-lg">
              {event.title}
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-[#E5E5E5]">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{event.title}</h1>
          <div className="flex items-center gap-4 text-gray-500 font-medium">
             <span className="bg-gray-100 text-black px-3 py-1 rounded-lg text-xs font-bold">CME</span>
             <span>Hosted by Dr. Admin</span>
             <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
             <span>ID: {id?.slice(0, 8)}</span>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-full lg:w-[400px] flex flex-col h-full bg-white rounded-[40px] border border-[#E5E5E5] overflow-hidden">
        <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare size={20} className="text-orange-500" />
            <h2 className="font-bold text-lg">Live Engagement</h2>
          </div>
          <div className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-bold uppercase">Online</div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              <img src={msg.senderPhoto} className="w-8 h-8 rounded-full border border-gray-100" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-500">{msg.senderName} • <span className="font-medium opacity-60">12:05 PM</span></p>
                <div className="bg-[#F5F5F3] p-3 rounded-2xl rounded-tl-none font-medium text-sm leading-relaxed">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-40 py-20">
              <MessageSquare size={32} />
              <p className="font-bold text-sm">Waiting for conversation...</p>
              <p className="text-xs">Be the first to say something!</p>
            </div>
          )}
        </div>

        <form onSubmit={sendMessage} className="p-6 border-t border-[#E5E5E5]">
          <div className="relative">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask a question..."
              className="w-full bg-[#F5F5F3] border-none rounded-2xl py-4 pl-5 pr-14 font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-gray-400"
            />
            <button 
              type="submit"
              className="absolute right-2 top-2 bottom-2 bg-black text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-orange-500 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 text-center uppercase tracking-widest font-bold">Press enter to send</p>
        </form>
      </div>
    </div>
  );
}
