import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Send, LogOut, Paperclip, MoreVertical, Search, CheckCheck } from 'lucide-react';

// 1. TEMPEL FIREBASE CONFIG ANDA DI SINI
const firebaseConfig = {
  apiKey: "AIzaSyDL0S4x9EXO5GCXORMHAzwdSRnFAKqcSpc",
  authDomain: "wac-test-mode.firebaseapp.com",
  projectId: "wac-test-mode",
  storageBucket: "wac-test-mode.firebasestorage.app",
  messagingSenderId: "1032322585458",
  appId: "1:1032322585458:web:2433c2d9552bbf83c243eb",
  measurementId: "G-9V5ZEQHC98"
};

// 2. Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const GROUPS = [
  { id: 'g1', name: 'Keluarga Cemara 🏡', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=KC&backgroundColor=00a884' },
  { id: 'g2', name: 'Project Kantor 💻', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=PK&backgroundColor=0284c7' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeGroup, setActiveGroup] = useState(GROUPS[0]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Pantau status login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Ambil pesan dari grup yang aktif
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `messages_${activeGroup.id}`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [activeGroup.id, user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error login:", error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    await addDoc(collection(db, `messages_${activeGroup.id}`), {
      text: newMessage,
      uid: user.uid,
      senderName: user.displayName,
      senderAvatar: user.photoURL,
      timestamp: serverTimestamp()
    });
    setNewMessage('');
  };

  const handleForwardToWA = (text) => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // --- HALAMAN LOGIN ---
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f0f2f5]">
        <div className="bg-white p-10 rounded-lg shadow-lg text-center max-w-sm w-full">
          <h1 className="text-3xl font-bold text-[#00a884] mb-2">Web Chat</h1>
          <p className="mb-8 text-gray-500">Silakan login untuk masuk ke grup.</p>
          <button 
            onClick={handleLogin} 
            className="w-full bg-[#00a884] text-white py-3 rounded hover:bg-[#008f6f] transition font-semibold"
          >
            Login dengan Google
          </button>
        </div>
      </div>
    );
  }

  // --- HALAMAN CHAT UTAMA ---
  return (
    <div className="flex h-screen bg-[#f0f2f5] font-sans">
      {/* Sidebar Grup */}
      <div className="w-1/3 border-r border-gray-300 bg-white flex flex-col">
        {/* Header Profil Saya */}
        <div className="bg-[#f0f2f5] h-16 flex items-center justify-between px-4 py-2 border-b">
          <div className="flex items-center gap-3">
            <img src={user.photoURL} alt="Profil" className="w-10 h-10 rounded-full" />
            <span className="font-semibold text-gray-700 truncate">{user.displayName}</span>
          </div>
          <button onClick={() => signOut(auth)} title="Logout" className="text-gray-500 hover:text-red-500">
            <LogOut size={20} />
          </button>
        </div>
        
        {/* Search */}
        <div className="p-2 border-b bg-white">
          <div className="bg-[#f0f2f5] flex items-center rounded-lg px-3 py-1.5">
            <Search size={18} className="text-gray-500" />
            <input type="text" placeholder="Cari grup..." className="bg-transparent border-none outline-none ml-3 w-full text-sm" />
          </div>
        </div>

        {/* Daftar Grup */}
        <div className="flex-1 overflow-y-auto">
          {GROUPS.map(group => (
            <div 
              key={group.id} 
              onClick={() => setActiveGroup(group)}
              className={`flex items-center px-4 py-3 cursor-pointer hover:bg-[#f5f6f6] ${activeGroup.id === group.id ? 'bg-[#f0f2f5]' : ''}`}
            >
              <img src={group.avatar} alt={group.name} className="w-12 h-12 rounded-full mr-3" />
              <div className="flex-1 border-b border-gray-100 pb-3">
                <h3 className="font-medium text-gray-800">{group.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Area Chat */}
      <div className="flex-1 flex flex-col bg-[#efeae2]" style={{ backgroundImage: "url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')", opacity: 0.9 }}>
        {/* Header Grup */}
        <div className="bg-[#f0f2f5] h-16 flex items-center px-4 border-b">
          <img src={activeGroup.avatar} alt="Avatar" className="w-10 h-10 rounded-full mr-3" />
          <div>
            <h2 className="font-medium text-gray-800">{activeGroup.name}</h2>
          </div>
        </div>

        {/* Daftar Pesan */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {messages.map((msg) => {
            const isMe = msg.uid === user.uid;
            return (
              <div key={msg.id} className={`flex flex-col relative group max-w-[65%] ${isMe ? 'self-end' : 'self-start'}`}>
                {!isMe && <span className="text-xs text-gray-500 ml-1 mb-1">{msg.senderName}</span>}
                <div className={`p-2 px-3 rounded-lg shadow-sm text-sm relative ${isMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                  {msg.text}
                  <span className="text-[10px] text-gray-400 ml-3 float-right mt-1 flex items-center">
                    {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    {isMe && <CheckCheck size={14} className="ml-1 text-blue-500" />}
                  </span>
                  
                  {/* Tombol Teruskan ke WA (Muncul saat di-hover) */}
                  <button 
                    onClick={() => handleForwardToWA(msg.text)}
                    className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 bg-white rounded-full shadow hover:bg-gray-100 transition"
                    title="Teruskan ke WhatsApp"
                  >
                    <MoreVertical size={16} className="text-gray-500" />
                  </button>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Kirim Pesan */}
        <form onSubmit={handleSendMessage} className="bg-[#f0f2f5] p-3 flex items-center gap-3">
          <button type="button" className="text-gray-500 hover:text-gray-700 p-2">
            <Paperclip size={24} />
          </button>
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ketik pesan" 
            className="flex-1 py-2 px-4 rounded-lg bg-white border-none outline-none focus:ring-1 focus:ring-gray-300"
          />
          <button type="submit" disabled={!newMessage.trim()} className="text-gray-500 hover:text-gray-700 p-2">
            <Send size={24} className={newMessage.trim() ? "text-[#00a884]" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
}