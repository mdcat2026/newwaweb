// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, where } from 'firebase/firestore';
import { Send, LogOut, Paperclip, Search, CheckCheck, FileText, ArrowLeft, Download, Smile, ChevronDown, Trash2, Edit2, Share2, X, Users, User, CheckSquare, Square, MessageSquarePlus, MessageSquare, Edit3, Camera } from 'lucide-react';

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
  
  // STATE CHAT & ROOMS
  const [chatRooms, setChatRooms] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // STATE UI & INTERAKSI
  const [isUploading, setIsUploading] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false); 
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  // MENGAMBIL DAFTAR CHAT DENGAN PRIVASI (Grup Publik atau Japri Pribadi)
  useEffect(() => {
    if (!user) return;
    const qRooms = query(collection(db, 'chatRooms'), orderBy('createdAt', 'desc'));
    
    const unsubRooms = onSnapshot(qRooms, (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter Privasi di Frontend: Tampilkan jika tipe='group' ATAU jika tipe='private' dan user adalah salah satu partisipan
      const filteredRooms = rooms.filter(room => {
        if (room.type === 'group') return true;
        if (room.type === 'private' && room.participants?.includes(user.email)) return true;
        return false;
      });
      
      setChatRooms(filteredRooms);
    });
    return () => unsubRooms();
  }, [user]);

  // MENGAMBIL PESAN DARI CHAT YANG AKTIF
  useEffect(() => {
    if (!user || !activeGroup) return;
    const q = query(collection(db, `messages_${activeGroup.id}`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    
    setIsSelectionMode(false);
    setSelectedMessages([]);
    setShowGroupInfo(false); 
    return () => unsubscribe();
  }, [activeGroup?.id, user]);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } 
    catch (error) { console.error("Error login:", error); }
  };

  // FITUR: BUAT CHAT BARU (JAPRI ATAU GRUP)
  const handleCreateNewChat = async (type) => {
    if (type === 'group') {
      const chatName = window.prompt("Masukkan Nama Grup Baru:");
      if (!chatName || !chatName.trim()) return;
      try {
        const newRoom = await addDoc(collection(db, 'chatRooms'), {
          name: chatName,
          type: 'group',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(chatName)}&backgroundColor=0f172a`,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          participants: [] 
        });
        setActiveGroup({ id: newRoom.id, name: chatName, type: 'group' });
        setIsMobileChatOpen(true);
      } catch (error) { alert("Gagal membuat grup."); }
    } 
    else if (type === 'private') {
      const targetEmail = window.prompt("Masukkan Email orang yang ingin di-Japri:");
      if (!targetEmail || !targetEmail.trim() || targetEmail === user.email) return;
      try {
        const newRoom = await addDoc(collection(db, 'chatRooms'), {
          name: `Chat: ${targetEmail.split('@')[0]}`,
          type: 'private',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(targetEmail)}&backgroundColor=0284c7`,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          participants: [user.email, targetEmail.toLowerCase().trim()] // Kunci Privasi
        });
        setActiveGroup({ id: newRoom.id, name: `Chat dengan ${targetEmail}`, type: 'private' });
        setIsMobileChatOpen(true);
      } catch (error) { alert("Gagal membuat chat pribadi."); }
    }
  };

  // FITUR: EDIT NAMA & FOTO GRUP
  const handleEditGroupName = async () => {
    if (!isAdmin && activeGroup.createdBy !== user.uid) return alert("Hanya pembuat grup atau Admin yang bisa mengubah nama.");
    const newName = window.prompt("Ubah nama grup/chat:", activeGroup.name);
    if (newName && newName.trim()) {
      await updateDoc(doc(db, 'chatRooms', activeGroup.id), { name: newName });
      setActiveGroup({...activeGroup, name: newName});
    }
  };

  const handleUpdateGroupPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!isAdmin && activeGroup.createdBy !== user.uid) return alert("Hanya Admin/Pembuat yang bisa mengubah foto.");
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.secure_url) {
        await updateDoc(doc(db, 'chatRooms', activeGroup.id), { avatar: data.secure_url });
        setActiveGroup({...activeGroup, avatar: data.secure_url});
      }
    } catch (error) { alert("Gagal mengubah foto profil."); }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeGroup) return;
    
    if (editingMessage) {
      await updateDoc(doc(db, `messages_${activeGroup.id}`, editingMessage.id), { text: newMessage, isEdited: true });
      setEditingMessage(null);
    } else {
      await addDoc(collection(db, `messages_${activeGroup.id}`), {
        text: newMessage, uid: user.uid, senderName: user.displayName, senderAvatar: user.photoURL, timestamp: serverTimestamp(), isEdited: false
      });
    }
    setNewMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  // FITUR: HAPUS MASSAL & HAPUS SATUAN
  const handleDeleteMessage = async (msgId = null) => {
    const isBulk = isSelectionMode && selectedMessages.length > 0;
    const msgCount = isBulk ? selectedMessages.length : 1;
    
    if (window.confirm(`Hapus ${msgCount} pesan secara permanen?`)) {
      if (isBulk) {
        // Hapus Multiple
        for (const id of selectedMessages) {
          await deleteDoc(doc(db, `messages_${activeGroup.id}`, id));
        }
        setIsSelectionMode(false);
        setSelectedMessages([]);
      } else {
        // Hapus Single
        await deleteDoc(doc(db, `messages_${activeGroup.id}`, msgId));
      }
      setOpenMenuId(null);
    }
  };

  // ... (Fungsi Upload Cloudinary, Formatting Text, dan Event Listeners tetap sama seperti versi sebelumnya) ...
  const startEditing = (msg) => { setEditingMessage(msg); setNewMessage(msg.text); setOpenMenuId(null); setTimeout(() => textareaRef.current?.focus(), 100); };
  const cancelEditing = () => { setEditingMessage(null); setNewMessage(''); if (textareaRef.current) textareaRef.current.style.height = 'auto'; };
  const handleInputResize = (e) => { setNewMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; };
  const handleKeyDown = (e) => { const isMobile = window.innerWidth <= 768; if (e.key === 'Enter' && !e.shiftKey && !isMobile) { e.preventDefault(); handleSendMessage(e); } };
  
  const handleFileSelection = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingUploadFile(file);
    setUploadCaption('');
    setPendingPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    e.target.value = ''; 
  };

  const confirmUpload = async () => {
    if (!pendingUploadFile || !activeGroup) return;
    setIsUploading(true);
    const isImage = pendingUploadFile.type.startsWith('image/');
    const formData = new FormData();
    formData.append('file', pendingUploadFile);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isImage ? 'image' : 'raw'}/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.secure_url) {
        await addDoc(collection(db, `messages_${activeGroup.id}`), {
          text: uploadCaption || '', fileData: data.secure_url, fileName: pendingUploadFile.name || 'Lampiran', isImage: isImage, uid: user.uid, senderName: user.displayName, senderAvatar: user.photoURL, timestamp: serverTimestamp()
        });
        setPendingUploadFile(null); setPendingPreviewUrl(null); setUploadCaption('');
      } else { throw new Error(data.error?.message); }
    } catch (error) { alert(`GAGAL UPLOAD!\nPastikan nama Cloudinary dan Preset di kode sudah benar.`); }
    setIsUploading(false);
  };

  const cancelUpload = () => { setPendingUploadFile(null); setPendingPreviewUrl(null); setUploadCaption(''); };
  
  const toggleSelection = (msgId) => {
    if (selectedMessages.includes(msgId)) {
      const newSelection = selectedMessages.filter(id => id !== msgId);
      setSelectedMessages(newSelection);
      if (newSelection.length === 0) setIsSelectionMode(false);
    } else { setSelectedMessages([...selectedMessages, msgId]); }
  };
  const startSelectionMode = (initialMsgId) => { setIsSelectionMode(true); setSelectedMessages([initialMsgId]); setOpenMenuId(null); };

  const formatText = (text) => {
    if (!text) return { __html: '' };
    let formatted = text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*(.*?)\*/g, "<strong>$1</strong>").replace(/_(.*?)_/g, "<em>$1</em>").replace(/\n/g, "<br />");
    return { __html: formatted };
  };

  // ================= UI RENDER =================
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f172a]">
        <div className="bg-[#1e293b] p-10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center max-w-sm w-full mx-4 border border-[#334155] backdrop-blur-xl">
          <div className="w-16 h-16 bg-gradient-to-tr from-[#10b981] to-[#3b82f6] rounded-xl mx-auto mb-6 shadow-lg flex items-center justify-center">
            <MessageSquare size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#10b981] to-[#3b82f6] mb-2">Nexus Chat</h1>
          <p className="mb-8 text-[#94a3b8] text-sm">Enterprise Secure Messaging</p>
          <button onClick={handleLogin} className="w-full bg-gradient-to-r from-[#10b981] to-[#059669] text-white py-3.5 rounded-xl hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all font-semibold tracking-wide">
            Masuk dengan Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-[100dvh] bg-[#0f172a] font-sans overflow-hidden text-[#f1f5f9]" onClick={() => setOpenMenuId(null)}>
      
      {/* 1. LAYAR PRA-KIRIM FILE (Tetap sama) */}
      {pendingUploadFile && ( /* ... kode popup upload file sama seperti sebelumnya ... */ 
        <div className="fixed inset-0 z-[300] bg-[#020617]/95 flex flex-col backdrop-blur-sm">
           <div className="h-16 flex items-center px-4 shrink-0 border-b border-[#334155]">
            <button onClick={cancelUpload} className="text-[#94a3b8] p-2 hover:bg-[#1e293b] rounded-full transition"><X size={26} /></button>
            <span className="text-[#f1f5f9] ml-4 font-semibold">Kirim ke {activeGroup?.name}</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden">
            {pendingPreviewUrl ? <img src={pendingPreviewUrl} alt="Preview" className="max-w-full max-h-full rounded-lg drop-shadow-2xl" /> : <FileText size={100} className="text-[#475569]" />}
          </div>
          <div className="bg-[#0f172a] px-4 py-4 flex items-end gap-3 border-t border-[#334155]">
            <textarea value={uploadCaption} onChange={(e) => setUploadCaption(e.target.value)} rows={1} placeholder="Tambahkan keterangan..." className="flex-1 py-3 px-5 bg-[#1e293b] rounded-xl border border-[#334155] outline-none text-[#f1f5f9]" />
            <button onClick={confirmUpload} className="bg-[#10b981] p-3.5 rounded-xl hover:bg-[#059669] transition"><Send size={24} className="text-white" /></button>
          </div>
        </div>
      )}

      {/* 3. SIDEBAR KIRI (Daftar Chat) */}
      <div className={`${isMobileChatOpen ? 'hidden md:flex' : 'flex'} w-full md:w-[30%] lg:w-[25%] border-r border-[#1e293b] bg-[#0f172a] flex-col h-full z-10 shrink-0 shadow-2xl`}>
        <div className="bg-[#0f172a] h-20 flex items-center justify-between px-5 shrink-0 border-b border-[#1e293b]">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src={user.photoURL} alt="Profil" className="w-11 h-11 rounded-xl shadow-md border border-[#334155]" />
            <div>
              <div className="font-bold text-[#f1f5f9] truncate text-sm">{user.displayName}</div>
              <div className="text-[11px] text-[#10b981] font-medium">{isAdmin ? 'Administrator' : 'Online'}</div>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="hover:bg-[#1e293b] p-2.5 rounded-xl transition-colors text-[#ef4444]"><LogOut size={18} /></button>
        </div>
        
        <div className="p-4 bg-[#0f172a] shrink-0 flex gap-2 border-b border-[#1e293b]">
           {/* Tombol Buat Grup */}
           <button onClick={() => handleCreateNewChat('group')} className="flex-1 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition">
              <Users size={16} className="text-[#3b82f6]" /> Grup
           </button>
           {/* Tombol Buat Japri */}
           <button onClick={() => handleCreateNewChat('private')} className="flex-1 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition">
              <User size={16} className="text-[#10b981]" /> Japri
           </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#0f172a] p-2">
          {chatRooms.map(room => (
            <div key={room.id} onClick={() => { setActiveGroup(room); setIsMobileChatOpen(true); }} className={`flex items-center p-3 mb-1 cursor-pointer rounded-xl transition-all ${activeGroup?.id === room.id ? 'bg-[#1e293b] border border-[#334155]' : 'hover:bg-[#1e293b]/50 border border-transparent'}`}>
              <div className="relative">
                <img src={room.avatar} alt={room.name} className={`w-12 h-12 rounded-xl mr-4 object-cover ${room.type === 'private' ? 'rounded-full' : ''}`} />
                {room.type === 'private' && <div className="absolute -bottom-1 -right-1 bg-[#10b981] w-4 h-4 rounded-full border-2 border-[#0f172a]"></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#f8fafc] truncate text-[15px]">{room.name}</h3>
                <p className="text-[13px] text-[#64748b] truncate">{room.type === 'private' ? 'Pesan Pribadi' : 'Grup Chat'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. AREA CHAT TENGAH */}
      <div className={`${isMobileChatOpen && !showGroupInfo ? 'flex' : 'hidden md:flex'} flex-1 flex-col w-full h-full bg-[#020617] relative`}>
        
        {!activeGroup ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0f172a]">
             <div className="w-24 h-24 bg-[#1e293b] rounded-3xl mb-6 shadow-2xl flex items-center justify-center border border-[#334155]">
                <MessageSquare className="text-[#3b82f6]" size={40} />
             </div>
             <h1 className="text-2xl font-bold text-[#f1f5f9] mb-2">Nexus Enterprise</h1>
             <p className="text-[#64748b] text-sm">Pilih percakapan untuk memulai atau buat baru.</p>
          </div>
        ) : (
          <>
            {/* Header Chat */}
            <div className="bg-[#0f172a]/90 backdrop-blur-md h-20 flex items-center justify-between px-6 shrink-0 z-20 border-b border-[#1e293b] cursor-pointer" onClick={() => setShowGroupInfo(!showGroupInfo)}>
              <div className="flex items-center min-w-0">
                <button onClick={(e) => { e.stopPropagation(); setIsMobileChatOpen(false); }} className="md:hidden mr-4 text-[#94a3b8]"><ArrowLeft size={24} /></button>
                <img src={activeGroup.avatar} alt="Avatar" className={`w-11 h-11 object-cover mr-4 shadow-sm ${activeGroup.type === 'private' ? 'rounded-full' : 'rounded-xl'}`} />
                <div className="truncate">
                  <h2 className="font-bold text-[#f8fafc] truncate text-[16px] flex items-center gap-2">
                    {activeGroup.name}
                    {activeGroup.type === 'private' && <span className="px-2 py-0.5 bg-[#10b981]/20 text-[#10b981] text-[10px] rounded-md uppercase tracking-wider">Private</span>}
                  </h2>
                  <p className="text-xs text-[#64748b] truncate mt-0.5">Klik untuk melihat detail & media</p>
                </div>
              </div>
              {isSelectionMode && (
                <div className="flex items-center gap-4 bg-[#1e293b] px-4 py-2 rounded-xl border border-[#334155]" onClick={e => e.stopPropagation()}>
                  <span className="text-[#3b82f6] font-semibold text-sm">{selectedMessages.length} dipilih</span>
                  <button onClick={() => { setIsSelectionMode(false); setSelectedMessages([]); }} className="text-[#94a3b8] hover:text-white"><X size={18} /></button>
                </div>
              )}
            </div>

            {/* Bubble Chat */}
            <div className="flex-1 overflow-y-auto p-4 md:px-12 flex flex-col gap-2 relative z-0 pb-4">
              {messages.map((msg, index) => {
                const isMe = msg.uid === user.uid;
                const isMenuOpen = openMenuId === msg.id;
                const isSelected = selectedMessages.includes(msg.id);

                return (
                  <div key={msg.id} className={`flex items-center relative ${isMe ? 'justify-end' : 'justify-start'} mt-2 group`}>
                    {isSelectionMode && (
                      <div onClick={() => toggleSelection(msg.id)} className="mr-3 cursor-pointer text-[#3b82f6] shrink-0">
                        {isSelected ? <CheckSquare size={22} /> : <Square size={22} className="text-[#475569]" />}
                      </div>
                    )}
                    <div onClick={() => isSelectionMode && toggleSelection(msg.id)} className={`flex flex-col relative max-w-[85%] md:max-w-[70%] ${isSelectionMode ? 'cursor-pointer' : ''}`}>
                      <div className={`p-3 rounded-2xl shadow-sm text-[15px] relative leading-relaxed border
                        ${isMe ? 'bg-[#10b981]/10 border-[#10b981]/20 text-[#f1f5f9] rounded-br-sm' : 'bg-[#1e293b] border-[#334155] text-[#f1f5f9] rounded-bl-sm'}
                        ${isSelected ? 'ring-2 ring-[#3b82f6]' : ''}
                      `}>
                        {!isMe && activeGroup.type !== 'private' && <div className="text-[12px] font-bold text-[#3b82f6] mb-1">{msg.senderName}</div>}
                        
                        {/* Dropdown Menu Toggle */}
                        {!isSelectionMode && (
                          <div onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : msg.id); }} className={`absolute top-2 right-2 cursor-pointer p-1 rounded-md z-20 md:opacity-0 md:group-hover:opacity-100 ${isMenuOpen ? 'opacity-100 bg-[#334155]' : 'hover:bg-[#334155]'}`}>
                            <ChevronDown size={18} className="text-[#94a3b8]" />
                          </div>
                        )}

                        {/* Isi Menu Popup */}
                        {isMenuOpen && (
                          <div onClick={(e) => e.stopPropagation()} className={`absolute top-8 ${isMe ? 'right-0' : 'left-5'} bg-[#0f172a] border border-[#334155] shadow-2xl rounded-xl py-2 w-48 z-[100] overflow-hidden`}>
                            <button onClick={() => startSelectionMode(msg.id)} className="w-full text-left px-4 py-2.5 text-sm text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-3"><CheckSquare size={16} /> Pilih Pesan</button>
                            {isMe && <button onClick={() => startEditing(msg)} className="w-full text-left px-4 py-2.5 text-sm text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-3"><Edit2 size={16} /> Edit Pesan</button>}
                            {(isMe || isAdmin) && <button onClick={() => handleDeleteMessage(msg.id)} className="w-full text-left px-4 py-2.5 text-sm text-[#ef4444] hover:bg-[#1e293b] flex items-center gap-3"><Trash2 size={16} /> Hapus Pesan</button>}
                          </div>
                        )}
                        
                        {msg.text && <div dangerouslySetInnerHTML={formatText(msg.text)} className="pr-6" />}
                        
                        <div className="flex items-center justify-end gap-1.5 mt-2">
                          {msg.isEdited && <span className="text-[10px] text-[#64748b] italic">diedit</span>}
                          <span className="text-[10px] text-[#64748b]">{msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                          {isMe && <CheckCheck size={14} className="text-[#3b82f6]" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form & Bulk Delete Menu */}
            {isSelectionMode ? (
              <div className="bg-[#0f172a]/90 backdrop-blur-md px-6 py-4 flex justify-between items-center z-10 border-t border-[#1e293b]">
                <button onClick={() => { setIsSelectionMode(false); setSelectedMessages([]); }} className="text-[#94a3b8] font-medium p-2 hover:bg-[#1e293b] rounded-lg">Batal</button>
                <div className="flex gap-3">
                  <button onClick={() => handleDeleteMessage()} disabled={selectedMessages.length === 0} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/20 disabled:opacity-50 transition">
                    <Trash2 size={18} /> Hapus Massal
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="bg-[#0f172a]/90 backdrop-blur-md px-4 md:px-8 py-4 flex items-end gap-3 shrink-0 z-10 border-t border-[#1e293b]">
                <input type="file" ref={fileInputRef} onChange={handleFileSelection} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[#94a3b8] hover:text-[#3b82f6] p-3 transition-colors bg-[#1e293b] rounded-xl border border-[#334155] mb-1">
                  <Paperclip size={20} />
                </button>
                
                <div className="flex-1 bg-[#1e293b] rounded-xl border border-[#334155] mb-1 flex items-center pl-4 focus-within:border-[#3b82f6] transition-colors shadow-inner">
                  <textarea ref={textareaRef} value={newMessage} onChange={handleInputResize} onKeyDown={handleKeyDown} rows={1} placeholder={editingMessage ? "Edit pesan..." : "Ketik pesan rahasia..."} className="flex-1 py-3 bg-transparent border-none outline-none resize-none text-[#f1f5f9] placeholder-[#64748b] text-[15px]" />
                </div>
                <button type="submit" disabled={!newMessage.trim()} className={`p-3 shrink-0 mb-1 rounded-xl transition-all shadow-lg ${newMessage.trim() ? "bg-gradient-to-r from-[#10b981] to-[#059669] text-white" : "bg-[#1e293b] text-[#64748b] border border-[#334155]"}`}>
                  <Send size={20} className={newMessage.trim() ? "ml-1" : ""} />
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* 5. SIDEBAR INFO GRUP KANAN (Dengan Fitur Edit Profile) */}
      {showGroupInfo && activeGroup && (
        <div className={`w-full md:w-[350px] lg:w-[400px] border-l border-[#1e293b] bg-[#0f172a] flex-col h-full z-20 absolute right-0 md:relative ${showGroupInfo ? 'flex' : 'hidden'} shadow-2xl`}>
          <div className="bg-[#0f172a] h-20 flex items-center px-6 shrink-0 border-b border-[#1e293b] gap-4">
            <button onClick={() => setShowGroupInfo(false)} className="text-[#94a3b8] hover:bg-[#1e293b] p-2 rounded-xl"><X size={20} /></button>
            <span className="text-[#f1f5f9] font-bold text-[16px]">Detail Percakapan</span>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#020617]">
            <div className="flex flex-col items-center py-10 bg-[#0f172a] mb-2 border-b border-[#1e293b]">
              
              {/* EDIT AVATAR GRUP */}
              <div className="relative group cursor-pointer mb-6">
                <img src={activeGroup.avatar} alt="Avatar" className={`w-32 h-32 object-cover border-4 border-[#1e293b] shadow-xl ${activeGroup.type === 'private' ? 'rounded-full' : 'rounded-2xl'}`} />
                {(isAdmin || activeGroup.createdBy === user.uid) && (
                  <div onClick={() => groupPhotoInputRef.current?.click()} className="absolute inset-0 bg-black/50 rounded-2xl md:opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <Camera className="text-white" size={28} />
                  </div>
                )}
                <input type="file" ref={groupPhotoInputRef} onChange={handleUpdateGroupPhoto} accept="image/*" className="hidden" />
              </div>
              
              {/* EDIT NAMA GRUP */}
              <div className="flex items-center gap-3">
                <h2 className="text-[#f8fafc] text-xl font-bold">{activeGroup.name}</h2>
                {(isAdmin || activeGroup.createdBy === user.uid) && (
                  <button onClick={handleEditGroupName} className="text-[#3b82f6] hover:bg-[#1e293b] p-1.5 rounded-lg"><Edit3 size={16} /></button>
                )}
              </div>
              <p className="text-[#64748b] text-sm mt-2">{activeGroup.type === 'private' ? 'Komunikasi End-to-End Pribadi' : 'Ruang Kolaborasi Tim'}</p>
            </div>
            
            {/* Info Dokumen/Media */}
            <div className="bg-[#0f172a] p-6 min-h-[300px] border-t border-[#1e293b]">
              <h3 className="text-[#f1f5f9] font-semibold text-sm mb-4 flex items-center gap-2"><FileText size={16} className="text-[#3b82f6]"/> File Terkirim</h3>
              <div className="flex flex-col gap-3">
                {messages.filter(m => m.fileData).length === 0 && <p className="text-[#64748b] text-sm">Belum ada file.</p>}
                {messages.filter(m => m.fileData).map(m => (
                  <a key={m.id} href={m.fileData} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-[#1e293b] rounded-xl border border-[#334155] hover:border-[#3b82f6]/50 transition">
                    <div className="w-10 h-10 bg-[#334155] rounded-lg flex items-center justify-center shrink-0">
                      {m.isImage ? <img src={m.fileData} className="w-full h-full object-cover rounded-lg" /> : <FileText size={20} className="text-[#10b981]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#f1f5f9] text-sm truncate">{m.fileName}</p>
                      <p className="text-xs text-[#64748b] mt-1">{new Date(m.timestamp?.toDate()).toLocaleDateString()}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}