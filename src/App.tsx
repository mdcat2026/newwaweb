// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Send, LogOut, Paperclip, Search, CheckCheck, FileText, ArrowLeft, Download, Smile, ChevronDown, Trash2, Edit2, Share2, X, Users, User, CheckSquare, Square, MessageSquare, Edit3, Camera, Plus, MoreVertical, Eye, BellRing } from 'lucide-react';

// ==========================================
// 1. TEMPEL FIREBASE CONFIG ANDA DI BAWAH INI
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDL0S4x9EXO5GCXORMHAzwdSRnFAKqcSpc",
  authDomain: "wac-test-mode.firebaseapp.com",
  projectId: "wac-test-mode",
  storageBucket: "wac-test-mode.firebasestorage.app",
  messagingSenderId: "1032322585458",
  appId: "1:1032322585458:web:2433c2d9552bbf83c243eb",
  measurementId: "G-9V5ZEQHC98"
};

// ==========================================
// 2. PENGATURAN CLOUDINARY & ADMIN
// ==========================================
const CLOUDINARY_CLOUD_NAME = 'm8cnadmw'; 
const CLOUDINARY_UPLOAD_PRESET = 'Newwaweb'; 
const ADMIN_EMAIL = 'buyerfood24@gmail.com'; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  
  // STATE CHAT & ROOMS
  const [chatRooms, setChatRooms] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // STATE PENCARIAN (SEARCH)
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState(null);
  const [chatSearch, setChatSearch] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  
  // STATE UI & INTERAKSI
  const [isUploading, setIsUploading] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false); 
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showRoomOptions, setShowRoomOptions] = useState(false);
  
  // NOTIFIKASI
  const [notifications, setNotifications] = useState([]);
  const [localReadStatus, setLocalReadStatus] = useState({});
  
  // STATE MODAL CUSTOM
  const [modalConfig, setModalConfig] = useState({ type: null }); // 'group', 'japri', 'forward'
  const [newGroupName, setNewGroupName] = useState('');
  
  // STATE FILE & SELECTION
  const [previewMedia, setPreviewMedia] = useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
  const [uploadCaption, setUploadCaption] = useState('');
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const groupPhotoInputRef = useRef(null);
  const textareaRef = useRef(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await setDoc(doc(db, 'users', currentUser.uid), {
          uid: currentUser.uid, email: currentUser.email, name: currentUser.displayName, photo: currentUser.photoURL, lastSeen: serverTimestamp()
        }, { merge: true });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const qUsers = query(collection(db, 'users'));
    const unsub = onSnapshot(qUsers, (snapshot) => {
      setContacts(snapshot.docs.map(d => d.data()).filter(u => u.uid !== user.uid));
    });
    return () => unsub();
  }, [user]);

  // LISTEN DAFTAR CHAT & NOTIFIKASI PESAN BARU
  useEffect(() => {
    if (!user) return;
    const qRooms = query(collection(db, 'chatRooms'), orderBy('lastMessageTime', 'desc'));
    const unsub = onSnapshot(qRooms, (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = rooms.filter(r => r.type === 'group' || (r.type === 'private' && r.participants?.includes(user.email)));
      
      // Deteksi pesan baru untuk Notifikasi Toast
      filtered.forEach(room => {
        if (room.lastMessageTime && room.lastSenderId !== user.uid) {
          const roomTime = room.lastMessageTime.toMillis ? room.lastMessageTime.toMillis() : Date.now();
          const readTime = localReadStatus[room.id] || 0;
          if (roomTime > readTime && activeGroup?.id !== room.id) {
             showNotification(room.name, room.lastMessage);
             setLocalReadStatus(prev => ({...prev, [room.id]: roomTime})); // Tandai sudah dinotif agar tidak spam
          }
        }
      });
      setChatRooms(filtered);
    });
    return () => unsub();
  }, [user, activeGroup, localReadStatus]);

  useEffect(() => {
    if (!user || !activeGroup) return;
    const q = query(collection(db, `messages_${activeGroup.id}`), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      
      // Update status terbaca (Read) saat room dibuka
      if(activeGroup) {
         setLocalReadStatus(prev => ({...prev, [activeGroup.id]: Date.now()}));
      }
    });
    setIsSelectionMode(false); setSelectedMessages([]); setShowGroupInfo(false); setChatSearch(''); setShowChatSearch(false);
    return () => unsub();
  }, [activeGroup?.id, user]);

  const showNotification = (title, body) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, title, body }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const handleLogin = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (error) { console.error("Error login:", error); }
  };

  const submitNewGroup = async () => {
    if (!newGroupName.trim()) return;
    const newRoom = await addDoc(collection(db, 'chatRooms'), {
      name: newGroupName, type: 'group', avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newGroupName)}&backgroundColor=0f172a`,
      createdAt: serverTimestamp(), lastMessageTime: serverTimestamp(), createdBy: user.uid, participants: [] 
    });
    setActiveGroup({ id: newRoom.id, name: newGroupName, type: 'group' });
    setModalConfig({ type: null }); setNewGroupName(''); setIsMobileChatOpen(true);
  };

  const submitNewJapri = async (targetUser) => {
    const existingRoom = chatRooms.find(r => r.type === 'private' && r.participants.includes(targetUser.email));
    if (existingRoom) { setActiveGroup(existingRoom); } 
    else {
      const newRoom = await addDoc(collection(db, 'chatRooms'), {
        name: `Chat: ${targetUser.name}`, type: 'private', avatar: targetUser.photo,
        createdAt: serverTimestamp(), lastMessageTime: serverTimestamp(), createdBy: user.uid, participants: [user.email, targetUser.email] 
      });
      setActiveGroup({ id: newRoom.id, name: targetUser.name, type: 'private' });
    }
    setModalConfig({ type: null }); setIsMobileChatOpen(true);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeGroup) return;
    
    let msgText = newMessage;
    if (editingMessage) {
      await updateDoc(doc(db, `messages_${activeGroup.id}`, editingMessage.id), { text: msgText, isEdited: true });
      setEditingMessage(null);
    } else {
      await addDoc(collection(db, `messages_${activeGroup.id}`), {
        text: msgText, uid: user.uid, senderName: user.displayName, senderAvatar: user.photoURL, timestamp: serverTimestamp(), isEdited: false
      });
      // Update parent room
      await updateDoc(doc(db, 'chatRooms', activeGroup.id), {
        lastMessage: msgText.substring(0, 30) + (msgText.length>30?'...':''), lastSenderId: user.uid, lastMessageTime: serverTimestamp()
      });
    }
    setNewMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleClearAllMessages = async () => {
    if (window.confirm("PERINGATAN: Hapus SEMUA pesan di obrolan ini secara permanen untuk semua orang?")) {
      messages.forEach(async (m) => {
        await deleteDoc(doc(db, `messages_${activeGroup.id}`, m.id));
      });
      setShowRoomOptions(false);
    }
  };

  const executeInternalForward = async (targetRooms) => {
    if (!selectedMessages.length || !targetRooms.length) return;
    const msgsToForward = messages.filter(m => selectedMessages.includes(m.id));
    
    for (let room of targetRooms) {
      for (let msg of msgsToForward) {
        await addDoc(collection(db, `messages_${room.id}`), {
          text: msg.text || '', fileData: msg.fileData || null, fileName: msg.fileName || null, isImage: msg.isImage || false,
          uid: user.uid, senderName: user.displayName, senderAvatar: user.photoURL, timestamp: serverTimestamp(), isEdited: false, isForwarded: true
        });
      }
      await updateDoc(doc(db, 'chatRooms', room.id), {
        lastMessage: 'Pesan diteruskan...', lastSenderId: user.uid, lastMessageTime: serverTimestamp()
      });
    }
    setModalConfig({type: null}); setIsSelectionMode(false); setSelectedMessages([]);
    showNotification("Sukses", `Pesan diteruskan ke ${targetRooms.length} obrolan.`);
  };

  // PENCARIAN GLOBAL
  const handleGlobalSearch = async (e) => {
    if (e.key === 'Enter') {
      if (!sidebarSearch.trim()) { setGlobalSearchResults(null); return; }
      
      let results = [];
      for (let room of chatRooms) {
        const q = query(collection(db, `messages_${room.id}`), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        snap.forEach(docSnap => {
          const data = docSnap.data();
          const term = sidebarSearch.toLowerCase();
          if (data.text?.toLowerCase().includes(term) || data.fileName?.toLowerCase().includes(term)) {
            results.push({ ...data, id: docSnap.id, room: room });
          }
        });
      }
      setGlobalSearchResults(results);
    }
  };

  const jumpToMessage = (msgId, room = null) => {
    if(room && (!activeGroup || activeGroup.id !== room.id)) {
       setActiveGroup(room);
       setIsMobileChatOpen(true);
    }
    setShowGroupInfo(false);
    setGlobalSearchResults(null);
    
    setTimeout(() => {
      const el = document.getElementById(`msg-${msgId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-[#3b82f6]/30', 'transition-colors', 'duration-1000');
        setTimeout(() => el.classList.remove('bg-[#3b82f6]/30'), 2500);
      }
    }, 500);
  };

  const formatText = (text) => {
    if (!text) return { __html: '' };
    let formatted = text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*(.*?)\*/g, "<strong>$1</strong>").replace(/_(.*?)_/g, "<em>$1</em>").replace(/\n/g, "<br />");
    return { __html: formatted };
  };

  // ================= UI RENDER =================
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f172a]">
        <div className="bg-[#1e293b] p-10 rounded-2xl shadow-2xl text-center max-w-sm w-full mx-4 border border-[#334155]">
          <div className="w-16 h-16 bg-gradient-to-tr from-[#10b981] to-[#3b82f6] rounded-xl mx-auto mb-6 shadow-lg flex items-center justify-center"><MessageSquare size={32} className="text-white" /></div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#10b981] to-[#3b82f6] mb-2">Nexus Chat</h1>
          <p className="mb-8 text-[#94a3b8] text-sm">Enterprise Secure Messaging</p>
          <button onClick={handleLogin} className="w-full bg-gradient-to-r from-[#10b981] to-[#059669] text-white py-3.5 rounded-xl transition-all font-semibold">Masuk dengan Google</button>
        </div>
      </div>
    );
  }

  // Filter local
  const filteredRooms = chatRooms.filter(r => r.name.toLowerCase().includes(sidebarSearch.toLowerCase()));
  const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.email.toLowerCase().includes(contactSearch.toLowerCase()));
  const filteredMessages = chatSearch.trim() ? messages.filter(m => m.text?.toLowerCase().includes(chatSearch.toLowerCase()) || m.fileName?.toLowerCase().includes(chatSearch.toLowerCase())) : messages;

  return (
    <div className="flex w-full h-[100dvh] bg-[#0f172a] font-sans overflow-hidden text-[#f1f5f9]" onClick={() => {setOpenMenuId(null); setShowFabMenu(false); setShowRoomOptions(false);}}>
      <style>{`.hide-scroll::-webkit-scrollbar { display: none; } .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed top-5 right-5 z-[1000] flex flex-col gap-2 pointer-events-none">
        {notifications.map(notif => (
          <div key={notif.id} className="bg-[#1e293b] border border-[#3b82f6]/50 shadow-2xl rounded-xl p-4 w-72 flex items-start gap-3 animate-in slide-in-from-top-5 pointer-events-auto">
             <div className="bg-[#3b82f6]/20 p-2 rounded-lg text-[#3b82f6]"><BellRing size={20}/></div>
             <div><h4 className="font-bold text-sm text-[#f1f5f9]">{notif.title}</h4><p className="text-xs text-[#94a3b8] mt-1 truncate max-w-[200px]">{notif.body}</p></div>
          </div>
        ))}
      </div>

      {/* MODAL FORWARD INTERNAL */}
      {modalConfig.type === 'forward' && (
         <div className="fixed inset-0 z-[600] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-[#1e293b] w-full max-w-md rounded-2xl border border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
             <div className="p-4 border-b border-[#334155] flex justify-between items-center bg-[#0f172a]">
               <h2 className="font-bold text-[#f1f5f9] text-base flex items-center gap-2"><Share2 className="text-[#3b82f6]" size={18}/> Teruskan Pesan Ke...</h2>
               <button onClick={() => setModalConfig({type:null})} className="text-[#94a3b8] hover:text-white"><X size={20}/></button>
             </div>
             <div className="flex-1 overflow-y-auto hide-scroll p-2">
               {chatRooms.map(room => (
                 <div key={room.id} onClick={() => executeInternalForward([room])} className="flex items-center gap-3 p-3 hover:bg-[#334155] rounded-xl cursor-pointer transition">
                   <img src={room.avatar} alt={room.name} className="w-10 h-10 rounded-full" />
                   <p className="font-medium text-[#f1f5f9] text-sm truncate flex-1">{room.name}</p>
                 </div>
               ))}
             </div>
           </div>
         </div>
      )}

      {/* --- POP-UP CUSTOM UNTUK BUAT GRUP / JAPRI --- */}
      {modalConfig.type && modalConfig.type !== 'forward' && (
        <div className="fixed inset-0 z-[400] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e293b] w-full max-w-md rounded-2xl border border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-[#334155] flex justify-between items-center bg-[#0f172a]">
              <h2 className="font-bold text-[#f1f5f9] text-base flex items-center gap-2">
                {modalConfig.type === 'group' ? <Users className="text-[#3b82f6]" size={18}/> : <User className="text-[#10b981]" size={18}/>}
                {modalConfig.type === 'group' ? 'Buat Grup Baru' : 'Mulai Obrolan Baru'}
              </h2>
              <button onClick={() => {setModalConfig({type:null}); setNewGroupName('');}} className="text-[#94a3b8] hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto hide-scroll">
              {modalConfig.type === 'group' ? (
                <div>
                  <label className="block text-xs text-[#94a3b8] mb-2 uppercase font-semibold">Nama Grup</label>
                  <input type="text" autoFocus value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Ketik nama grup..." className="w-full bg-[#0f172a] border border-[#334155] text-white px-4 py-3 rounded-xl outline-none focus:border-[#3b82f6]" />
                  <button onClick={submitNewGroup} className="w-full mt-6 bg-[#3b82f6] text-white py-3 rounded-xl font-medium hover:bg-[#2563eb] transition text-sm">Buat Grup</button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center bg-[#0f172a] rounded-xl px-4 py-2 border border-[#334155] mb-4"><Search size={16} className="text-[#64748b]" /><input type="text" value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Cari kontak..." className="bg-transparent border-none outline-none text-sm text-white w-full ml-3" /></div>
                  <label className="block text-xs text-[#94a3b8] mb-2 uppercase font-semibold">Daftar Kontak ({filteredContacts.length})</label>
                  <div className="flex flex-col gap-2">
                    {filteredContacts.map(c => (
                      <div key={c.uid} onClick={() => submitNewJapri(c)} className="flex items-center gap-3 p-3 bg-[#0f172a] hover:bg-[#334155] border border-[#334155] rounded-xl cursor-pointer transition">
                        <img src={c.photo} alt={c.name} className="w-10 h-10 rounded-full" />
                        <div className="flex-1 min-w-0"><p className="font-medium text-[#f1f5f9] truncate text-sm">{c.name}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SIDEBAR KIRI */}
      <div className={`${isMobileChatOpen ? 'hidden md:flex' : 'flex'} w-full md:w-[30%] lg:w-[25%] border-r border-[#1e293b] bg-[#0f172a] flex-col h-full z-10 shrink-0 shadow-2xl relative`}>
        
        {/* COMPACT FAB Tombol (+) */}
        <div className="absolute bottom-5 right-5 z-50">
          {showFabMenu && (
             <div className="absolute bottom-14 right-0 bg-[#1e293b] rounded-xl shadow-2xl border border-[#334155] p-2 flex flex-col gap-1 w-40 mb-2 origin-bottom-right animate-in fade-in zoom-in duration-200">
               <button onClick={(e) => {e.stopPropagation(); setModalConfig({type: 'japri'}); setShowFabMenu(false);}} className="flex items-center gap-3 px-3 py-2 hover:bg-[#334155] rounded-lg text-sm text-[#f1f5f9] font-medium"><User size={16} className="text-[#10b981]"/> New Chat</button>
               <button onClick={(e) => {e.stopPropagation(); setModalConfig({type: 'group'}); setShowFabMenu(false);}} className="flex items-center gap-3 px-3 py-2 hover:bg-[#334155] rounded-lg text-sm text-[#f1f5f9] font-medium"><Users size={16} className="text-[#3b82f6]"/> New Group</button>
             </div>
          )}
          <button onClick={(e) => {e.stopPropagation(); setShowFabMenu(!showFabMenu);}} className="bg-[#10b981] p-3.5 rounded-full shadow-[0_4px_15px_rgba(16,185,129,0.4)] hover:bg-[#059669] transition-transform hover:scale-105 active:scale-95">
            <Plus size={22} className={`text-white transition-transform duration-300 ${showFabMenu ? 'rotate-45' : 'rotate-0'}`} />
          </button>
        </div>

        <div className="bg-[#0f172a] h-16 flex items-center justify-between px-4 shrink-0 border-b border-[#1e293b]">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src={user.photoURL} alt="Profil" className="w-8 h-8 rounded-xl shadow-md border border-[#334155]" />
            <div>
              <div className="font-bold text-[#f1f5f9] truncate text-[13px]">{user.displayName}</div>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="hover:bg-[#1e293b] p-2 rounded-xl transition-colors text-[#ef4444]" title="Keluar"><LogOut size={16} /></button>
        </div>
        
        <div className="p-3 bg-[#0f172a] shrink-0 border-b border-[#1e293b]">
           <div className="bg-[#1e293b] flex items-center rounded-xl px-3 py-2 border border-[#334155] focus-within:border-[#3b82f6] transition-colors">
              <Search size={16} className="text-[#64748b] shrink-0" />
              <input type="text" value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)} onKeyDown={handleGlobalSearch} placeholder="Cari / tekan Enter utk Global..." className="bg-transparent border-none outline-none ml-2 w-full text-xs text-[#f1f5f9] placeholder-[#64748b]" />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#0f172a] p-2 hide-scroll">
          {globalSearchResults ? (
             <div className="p-2">
                <div className="flex justify-between items-center mb-3"><span className="text-xs text-[#3b82f6] font-bold uppercase">Hasil Global ({globalSearchResults.length})</span> <button onClick={()=>setGlobalSearchResults(null)} className="text-[#ef4444] text-xs font-bold">Tutup</button></div>
                {globalSearchResults.map(res => (
                   <div key={res.id} onClick={() => jumpToMessage(res.id, res.room)} className="bg-[#1e293b] p-3 rounded-lg mb-2 border border-[#334155] cursor-pointer hover:border-[#3b82f6]/50">
                      <p className="text-[10px] text-[#10b981] mb-1 font-bold">{res.roomName} • {res.senderName}</p>
                      <p className="text-xs text-[#f1f5f9] truncate">{res.text || res.fileName}</p>
                   </div>
                ))}
             </div>
          ) : (
             filteredRooms.map(room => {
                const roomTime = room.lastMessageTime?.toMillis ? room.lastMessageTime.toMillis() : 0;
                const isUnread = roomTime > (localReadStatus[room.id] || 0) && room.lastSenderId !== user.uid;
                
                return (
                  <div key={room.id} onClick={() => { setActiveGroup(room); setIsMobileChatOpen(true); }} className={`flex items-center p-3 mb-1 cursor-pointer rounded-xl transition-all ${activeGroup?.id === room.id ? 'bg-[#1e293b] border border-[#334155]' : 'hover:bg-[#1e293b]/50 border border-transparent'}`}>
                    <div className="relative">
                      <img src={room.avatar} alt={room.name} className={`w-10 h-10 object-cover mr-3 ${room.type === 'private' ? 'rounded-full' : 'rounded-xl'}`} />
                      {room.type === 'private' && <div className="absolute -bottom-0.5 -right-0.5 bg-[#10b981] w-3 h-3 rounded-full border-2 border-[#0f172a]"></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`truncate text-[13px] ${isUnread ? 'font-bold text-white' : 'font-semibold text-[#f8fafc]'}`}>{room.name}</h3>
                      <p className={`text-[11px] truncate ${isUnread ? 'text-[#f1f5f9] font-medium' : 'text-[#64748b]'}`}>{room.lastMessage || 'Mulai obrolan...'}</p>
                    </div>
                    {isUnread && <div className="w-2.5 h-2.5 bg-[#10b981] rounded-full shadow-lg ml-2 shrink-0"></div>}
                  </div>
                )
             })
          )}
        </div>
      </div>

      {/* 4. AREA CHAT TENGAH */}
      <div className={`${isMobileChatOpen && !showGroupInfo ? 'flex' : 'hidden md:flex'} flex-1 flex-col w-full h-full bg-[#020617] relative`}>
        
        {!activeGroup ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0f172a]">
             <div className="w-16 h-16 bg-[#1e293b] rounded-2xl mb-4 shadow-2xl flex items-center justify-center border border-[#334155]"><MessageSquare className="text-[#3b82f6]" size={28} /></div>
             <h1 className="text-lg font-bold text-[#f1f5f9] mb-1">Nexus Enterprise</h1>
             <p className="text-[#64748b] text-xs">Pilih percakapan untuk memulai.</p>
          </div>
        ) : (
          <>
            <div className="bg-[#0f172a]/90 backdrop-blur-md h-16 flex items-center justify-between px-5 shrink-0 z-20 border-b border-[#1e293b]">
              <div className="flex items-center min-w-0 flex-1 cursor-pointer" onClick={() => setShowGroupInfo(!showGroupInfo)}>
                <button onClick={(e) => { e.stopPropagation(); setIsMobileChatOpen(false); }} className="md:hidden mr-3 text-[#94a3b8]"><ArrowLeft size={20} /></button>
                <img src={activeGroup.avatar} alt="Avatar" className={`w-9 h-9 object-cover mr-3 shadow-sm ${activeGroup.type === 'private' ? 'rounded-full' : 'rounded-xl'}`} />
                <div className="truncate">
                  <h2 className="font-bold text-[#f8fafc] truncate text-[14px] flex items-center gap-2">
                    {activeGroup.name}
                    {activeGroup.type === 'private' && <span className="px-1.5 py-0.5 bg-[#10b981]/20 text-[#10b981] text-[8px] rounded uppercase">Private</span>}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-1 relative">
                <button onClick={() => setShowChatSearch(!showChatSearch)} className={`p-2 rounded-xl transition-colors ${showChatSearch ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'text-[#94a3b8] hover:bg-[#1e293b]'}`} title="Cari pesan"><Search size={18} /></button>
                <button onClick={() => setShowRoomOptions(!showRoomOptions)} className="p-2 rounded-xl transition-colors text-[#94a3b8] hover:bg-[#1e293b]" title="Opsi"><MoreVertical size={18}/></button>
                
                {/* 3 TITIK MENU KANAN ATAS */}
                {showRoomOptions && (
                   <div className="absolute top-10 right-0 bg-[#0f172a] border border-[#334155] shadow-2xl rounded-xl py-2 w-48 z-[200]">
                      <button onClick={handleClearAllMessages} className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#ef4444] hover:bg-[#1e293b] flex items-center gap-3"><Trash2 size={14}/> Bersihkan Chat</button>
                   </div>
                )}
              </div>
            </div>

            {/* Kotak Pencarian dalam Obrolan */}
            {showChatSearch && (
              <div className="bg-[#0f172a] px-5 py-2.5 border-b border-[#1e293b] flex items-center shrink-0 z-10 shadow-md">
                <div className="flex-1 bg-[#1e293b] rounded-lg flex items-center px-3 py-1.5 border border-[#334155] focus-within:border-[#3b82f6] transition-colors">
                  <Search size={14} className="text-[#64748b] shrink-0" />
                  <input type="text" autoFocus value={chatSearch} onChange={e => setChatSearch(e.target.value)} placeholder="Cari di obrolan ini..." className="w-full bg-transparent border-none outline-none ml-2 text-xs text-[#f1f5f9] placeholder-[#64748b]" />
                </div>
                <button onClick={() => {setShowChatSearch(false); setChatSearch('');}} className="ml-3 text-[#94a3b8] hover:text-white"><X size={18}/></button>
              </div>
            )}

            {isSelectionMode && (
              <div className="bg-[#1e293b] px-4 py-2 absolute top-16 left-0 right-0 z-30 flex items-center justify-between border-b border-[#334155] shadow-lg">
                 <span className="text-[#3b82f6] font-semibold text-xs">{selectedMessages.length} dipilih</span>
                 <button onClick={() => { setIsSelectionMode(false); setSelectedMessages([]); }} className="text-[#94a3b8] hover:text-white text-xs font-bold">Batal</button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 md:px-12 flex flex-col gap-1.5 relative z-0 pb-4 hide-scroll">
              {filteredMessages.map((msg) => {
                const isMe = msg.uid === user.uid;
                const isMenuOpen = openMenuId === msg.id;
                const isSelected = selectedMessages.includes(msg.id);

                return (
                  <div key={msg.id} id={`msg-${msg.id}`} className={`flex items-center relative ${isMe ? 'justify-end' : 'justify-start'} mt-1 group rounded-xl`}>
                    {isSelectionMode && (
                      <div onClick={() => toggleSelection(msg.id)} className="mr-3 cursor-pointer text-[#3b82f6] shrink-0">
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-[#475569]" />}
                      </div>
                    )}
                    <div onClick={() => isSelectionMode && toggleSelection(msg.id)} className={`flex flex-col relative max-w-[85%] md:max-w-[70%] ${isSelectionMode ? 'cursor-pointer' : ''}`}>
                      <div className={`p-2.5 rounded-2xl shadow-sm text-[13.5px] relative leading-relaxed border
                        ${isMe ? 'bg-[#10b981]/10 border-[#10b981]/20 text-[#f1f5f9] rounded-br-sm' : 'bg-[#1e293b] border-[#334155] text-[#f1f5f9] rounded-bl-sm'}
                        ${isSelected ? 'ring-2 ring-[#3b82f6]' : ''}
                      `}>
                        {msg.isForwarded && <div className="text-[10px] text-[#94a3b8] italic mb-1 flex items-center gap-1"><Share2 size={10}/> Diteruskan</div>}
                        {!isMe && activeGroup.type !== 'private' && <div className="text-[10px] font-bold text-[#3b82f6] mb-1">{msg.senderName}</div>}
                        
                        {/* RENDER GAMBAR DAN DOKUMEN DALAM BUBBLE */}
                        {msg.isImage && (
                          <div className="mb-2 relative cursor-pointer group/media">
                            <img src={msg.fileData} className="max-w-full md:max-w-[250px] rounded-lg object-cover border border-[#334155]" alt="Lampiran" />
                          </div>
                        )}
                        {!msg.isImage && msg.fileData && (
                          <a href={msg.fileData} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-[#0f172a] p-2.5 rounded-xl mb-1.5 border border-[#334155] hover:border-[#3b82f6]/50 transition cursor-pointer">
                            <div className="w-8 h-8 bg-[#334155] rounded-md flex items-center justify-center shrink-0">
                              <FileText size={16} className="text-[#10b981]" />
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-medium text-[#f1f5f9] text-xs truncate">{msg.fileName}</p>
                            </div>
                          </a>
                        )}

                        {!isSelectionMode && (
                          <div onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : msg.id); }} className={`absolute top-1.5 right-1.5 cursor-pointer p-1 rounded-md z-20 md:opacity-0 md:group-hover:opacity-100 ${isMenuOpen ? 'opacity-100 bg-[#334155]' : 'hover:bg-[#334155]'}`}>
                            <ChevronDown size={14} className="text-[#94a3b8]" />
                          </div>
                        )}

                        {isMenuOpen && (
                          <div onClick={(e) => e.stopPropagation()} className={`absolute top-6 ${isMe ? 'right-0' : 'left-5'} bg-[#0f172a] border border-[#334155] shadow-2xl rounded-xl py-1.5 w-40 z-[100]`}>
                            <button onClick={() => {setModalConfig({type: 'forward'}); setIsSelectionMode(true); setSelectedMessages([msg.id]); setOpenMenuId(null);}} className="w-full text-left px-4 py-2 text-xs font-medium text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-3"><Share2 size={12} className="text-[#3b82f6]" /> Teruskan Chat</button>
                            <button onClick={() => {setIsSelectionMode(true); setSelectedMessages([msg.id]); setOpenMenuId(null);}} className="w-full text-left px-4 py-2 text-xs font-medium text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-3 border-b border-[#334155]"><CheckSquare size={12} className="text-[#10b981]"/> Pilih Pesan</button>
                            {isMe && <button onClick={() => startEditing(msg)} className="w-full text-left px-4 py-2 text-xs font-medium text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-3"><Edit2 size={12} className="text-[#eab308]" /> Edit Pesan</button>}
                            {(isMe || isAdmin) && <button onClick={() => handleDeleteMessage(msg.id)} className="w-full text-left px-4 py-2 text-xs font-medium text-[#ef4444] hover:bg-[#1e293b] flex items-center gap-3"><Trash2 size={12} /> Hapus Pesan</button>}
                          </div>
                        )}
                        
                        {msg.text && <div dangerouslySetInnerHTML={formatText(msg.text)} className="pr-5" />}
                        
                        <div className="flex items-center justify-end gap-1 mt-1">
                          {msg.isEdited && <span className="text-[8px] text-[#64748b] italic">diedit</span>}
                          <span className="text-[9px] text-[#64748b]">{msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                          {isMe && <CheckCheck size={12} className="text-[#3b82f6]" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {isSelectionMode ? (
              <div className="bg-[#0f172a]/90 backdrop-blur-md px-5 py-2.5 flex justify-between items-center z-10 border-t border-[#1e293b]">
                <button onClick={() => { setIsSelectionMode(false); setSelectedMessages([]); }} className="text-[#94a3b8] text-xs font-bold p-2 hover:bg-[#1e293b] rounded-lg">Batal</button>
                <div className="flex gap-2">
                  <button onClick={() => setModalConfig({type: 'forward'})} disabled={selectedMessages.length === 0} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 hover:bg-[#3b82f6]/20 disabled:opacity-50">
                    <Share2 size={14} /> Teruskan
                  </button>
                  <button onClick={() => handleDeleteMessage()} disabled={selectedMessages.length === 0} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/20 disabled:opacity-50">
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="bg-[#0f172a]/90 backdrop-blur-md px-4 py-2.5 flex items-end gap-2 shrink-0 z-10 border-t border-[#1e293b]">
                <input type="file" ref={fileInputRef} onChange={(e) => {
                   const file = e.target.files[0];
                   if(file){ setPendingUploadFile(file); setPendingPreviewUrl(file.type.startsWith('image/')?URL.createObjectURL(file):null); setUploadCaption(''); e.target.value='';}
                }} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[#94a3b8] hover:text-[#3b82f6] p-2.5 transition-colors bg-[#1e293b] rounded-xl border border-[#334155] mb-0.5">
                  <Paperclip size={16} />
                </button>
                
                <div className="flex-1 bg-[#1e293b] rounded-xl border border-[#334155] flex items-center pl-3 focus-within:border-[#3b82f6] transition-colors shadow-inner">
                  <textarea ref={textareaRef} value={newMessage} onChange={handleInputResize} onKeyDown={handleKeyDown} rows={1} placeholder={editingMessage ? "Edit pesan..." : "Ketik pesan..."} className="flex-1 py-2.5 bg-transparent border-none outline-none resize-none text-[#f1f5f9] placeholder-[#64748b] text-[13px] hide-scroll" />
                </div>
                <button type="submit" disabled={!newMessage.trim()} className={`p-2.5 shrink-0 rounded-xl transition-all shadow-lg ${newMessage.trim() ? "bg-gradient-to-r from-[#10b981] to-[#059669] text-white" : "bg-[#1e293b] text-[#64748b] border border-[#334155]"}`}>
                  <Send size={16} className={newMessage.trim() ? "ml-0.5" : ""} />
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* 5. SIDEBAR INFO GRUP KANAN */}
      {showGroupInfo && activeGroup && (
        <div className={`w-full md:w-[280px] lg:w-[320px] border-l border-[#1e293b] bg-[#0f172a] flex-col h-full z-20 absolute right-0 md:relative ${showGroupInfo ? 'flex' : 'hidden'} shadow-2xl`}>
          <div className="bg-[#0f172a] h-16 flex items-center px-4 shrink-0 border-b border-[#1e293b] gap-2">
            <button onClick={() => setShowGroupInfo(false)} className="text-[#94a3b8] hover:bg-[#1e293b] p-1.5 rounded-lg"><X size={16} /></button>
            <span className="text-[#f1f5f9] font-bold text-[13px]">Detail Percakapan</span>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#020617] hide-scroll">
            <div className="flex flex-col items-center py-6 bg-[#0f172a] mb-2 border-b border-[#1e293b]">
              <div className="relative group cursor-pointer mb-3">
                <img src={activeGroup.avatar} alt="Avatar" className={`w-20 h-20 object-cover border-4 border-[#1e293b] shadow-xl ${activeGroup.type === 'private' ? 'rounded-full' : 'rounded-2xl'}`} />
              </div>
              <div className="flex items-center gap-2 px-4 text-center">
                <h2 className="text-[#f8fafc] text-base font-bold truncate">{activeGroup.name}</h2>
              </div>
            </div>
            
            <div className="bg-[#0f172a] p-4 min-h-[300px] border-t border-[#1e293b]">
              <h3 className="text-[#f1f5f9] font-bold text-[11px] mb-3 uppercase tracking-wider flex items-center gap-1.5"><FileText size={12} className="text-[#3b82f6]"/> File Terkirim</h3>
              <div className="flex flex-col gap-2">
                {messages.filter(m => m.fileData).length === 0 && <p className="text-[#64748b] text-[11px]">Belum ada file.</p>}
                {messages.filter(m => m.fileData).map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-2 bg-[#1e293b] rounded-xl border border-[#334155] hover:border-[#3b82f6]/50 transition">
                    <div className="w-8 h-8 bg-[#334155] rounded-lg flex items-center justify-center shrink-0">
                      {m.isImage ? <img src={m.fileData} className="w-full h-full object-cover rounded-lg" /> : <FileText size={14} className="text-[#10b981]" />}
                    </div>
                    <div className="flex-1 min-w-0 pr-1">
                      <p className="font-medium text-[#f1f5f9] text-[11px] truncate">{m.fileName}</p>
                    </div>
                    
                    {/* TOMBOL MATA UNTUK JUMP TO MESSAGE */}
                    <button onClick={() => jumpToMessage(m.id)} className="p-1.5 bg-[#0f172a] rounded-lg hover:bg-[#3b82f6]/20 hover:text-[#3b82f6] transition text-[#94a3b8] shrink-0" title="Lihat di Chat"><Eye size={14}/></button>
                    
                    <a href={m.fileData} target="_blank" rel="noreferrer" className="p-1.5 bg-[#0f172a] rounded-lg hover:bg-[#10b981]/20 hover:text-[#10b981] transition text-[#94a3b8] shrink-0" title="Buka File"><Download size={14}/></a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}