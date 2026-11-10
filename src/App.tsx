// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Send, LogOut, Paperclip, Search, CheckCheck, FileText, ArrowLeft, Download, Smile, ChevronDown, Trash2, Edit2, Share2, X, Users, User, CheckSquare, Square, MessageSquare, Edit3, Camera, Plus } from 'lucide-react';

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
  
  // STATE MODAL CUSTOM
  const [modalConfig, setModalConfig] = useState({ type: null }); 
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
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const allUsers = snapshot.docs.map(d => d.data()).filter(u => u.uid !== user.uid);
      setContacts(allUsers);
    });
    return () => unsubUsers();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const qRooms = query(collection(db, 'chatRooms'), orderBy('createdAt', 'desc'));
    const unsubRooms = onSnapshot(qRooms, (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filteredRooms = rooms.filter(room => {
        if (room.type === 'group') return true;
        if (room.type === 'private' && room.participants?.includes(user.email)) return true;
        return false;
      });
      setChatRooms(filteredRooms);
    });
    return () => unsubRooms();
  }, [user]);

  useEffect(() => {
    if (!user || !activeGroup) return;
    const q = query(collection(db, `messages_${activeGroup.id}`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    setIsSelectionMode(false); setSelectedMessages([]); setShowGroupInfo(false); setChatSearch(''); setShowChatSearch(false);
    return () => unsubscribe();
  }, [activeGroup?.id, user]);

  useEffect(() => {
    const handlePaste = (e) => {
      if (!user || !activeGroup || modalConfig.type) return; 
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setPendingUploadFile(file); setPendingPreviewUrl(URL.createObjectURL(file)); setUploadCaption('');
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [user, activeGroup, modalConfig]);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (error) { console.error("Error login:", error); }
  };

  const submitNewGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const newRoom = await addDoc(collection(db, 'chatRooms'), {
        name: newGroupName, type: 'group',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newGroupName)}&backgroundColor=0f172a`,
        createdAt: serverTimestamp(), createdBy: user.uid, participants: [] 
      });
      setActiveGroup({ id: newRoom.id, name: newGroupName, type: 'group' });
      setModalConfig({ type: null }); setNewGroupName(''); setIsMobileChatOpen(true);
    } catch (error) { alert("Gagal membuat grup."); }
  };

  const submitNewJapri = async (targetUser) => {
    try {
      const existingRoom = chatRooms.find(r => r.type === 'private' && r.participants.includes(targetUser.email));
      if (existingRoom) { setActiveGroup(existingRoom); } 
      else {
        const newRoom = await addDoc(collection(db, 'chatRooms'), {
          name: `Chat: ${targetUser.name}`, type: 'private', avatar: targetUser.photo,
          createdAt: serverTimestamp(), createdBy: user.uid, participants: [user.email, targetUser.email] 
        });
        setActiveGroup({ id: newRoom.id, name: targetUser.name, type: 'private' });
      }
      setModalConfig({ type: null }); setIsMobileChatOpen(true);
    } catch (error) { alert("Gagal membuat chat pribadi."); }
  };

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
    formData.append('file', file); formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
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

  const handleDeleteMessage = async (msgId = null) => {
    const isBulk = isSelectionMode && selectedMessages.length > 0;
    const msgCount = isBulk ? selectedMessages.length : 1;
    if (window.confirm(`Hapus ${msgCount} pesan secara permanen?`)) {
      if (isBulk) {
        for (const id of selectedMessages) await deleteDoc(doc(db, `messages_${activeGroup.id}`, id));
        setIsSelectionMode(false); setSelectedMessages([]);
      } else {
        await deleteDoc(doc(db, `messages_${activeGroup.id}`, msgId));
      }
      setOpenMenuId(null);
    }
  };

  const startEditing = (msg) => { setEditingMessage(msg); setNewMessage(msg.text); setOpenMenuId(null); setTimeout(() => textareaRef.current?.focus(), 100); };
  const handleInputResize = (e) => { setNewMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; };
  const handleKeyDown = (e) => { const isMobile = window.innerWidth <= 768; if (e.key === 'Enter' && !e.shiftKey && !isMobile) { e.preventDefault(); handleSendMessage(e); } };
  
  const handleFileSelection = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingUploadFile(file); setUploadCaption('');
    setPendingPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    e.target.value = ''; 
  };

  const confirmUpload = async () => {
    if (!pendingUploadFile || !activeGroup) return;
    setIsUploading(true);
    const isImage = pendingUploadFile.type.startsWith('image/');
    const formData = new FormData();
    formData.append('file', pendingUploadFile); formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isImage ? 'image' : 'raw'}/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.secure_url) {
        await addDoc(collection(db, `messages_${activeGroup.id}`), {
          text: uploadCaption || '', fileData: data.secure_url, fileName: pendingUploadFile.name || 'Lampiran', isImage: isImage, uid: user.uid, senderName: user.displayName, senderAvatar: user.photoURL, timestamp: serverTimestamp()
        });
        setPendingUploadFile(null); setPendingPreviewUrl(null); setUploadCaption('');
      } else { throw new Error(data.error?.message); }
    } catch (error) { alert(`GAGAL UPLOAD!\nPastikan nama Cloudinary dan Preset sudah benar.`); }
    setIsUploading(false);
  };
  
  const toggleSelection = (msgId) => {
    if (selectedMessages.includes(msgId)) {
      const newSelection = selectedMessages.filter(id => id !== msgId);
      setSelectedMessages(newSelection);
      if (newSelection.length === 0) setIsSelectionMode(false);
    } else { setSelectedMessages([...selectedMessages, msgId]); }
  };

  const handleForwardToWA = (msgArray) => {
    let finalWaText = msgArray.map((m) => {
      let textSegment = m.text || '';
      let header = `Pesan dari *${m.senderName}*:`;
      if (m.fileName) return `${header}\n📁 [File]: ${m.fileData}\n${textSegment}`;
      return `${header}\n${textSegment}`;
    }).join('\n\n━━━━━━━━━━━━━━━\n\n'); 
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(finalWaText)}`, '_blank');
    setIsSelectionMode(false); setSelectedMessages([]); setOpenMenuId(null);
  };

  const handleForceDownload = (url) => {
    // Memaksa download Cloudinary via parameter fl_attachment
    let downloadUrl = url;
    if (url.includes('cloudinary.com') && !url.includes('fl_attachment')) {
      downloadUrl = url.replace('/upload/', '/upload/fl_attachment/');
    }
    window.open(downloadUrl, '_blank');
  };

  const formatText = (text) => {
    if (!text) return { __html: '' };
    let formatted = text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*(.*?)\*/g, "<strong>$1</strong>").replace(/_(.*?)_/g, "<em>$1</em>").replace(/\n/g, "<br />");
    return { __html: formatted };
  };

  // ================= FILTER PENCARIAN =================
  const filteredRooms = chatRooms.filter(r => r.name.toLowerCase().includes(sidebarSearch.toLowerCase()));
  const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.email.toLowerCase().includes(contactSearch.toLowerCase()));
  const filteredMessages = chatSearch.trim() ? messages.filter(m => m.text?.toLowerCase().includes(chatSearch.toLowerCase()) || m.fileName?.toLowerCase().includes(chatSearch.toLowerCase())) : messages;

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

  return (
    <div className="flex w-full h-[100dvh] bg-[#0f172a] font-sans overflow-hidden text-[#f1f5f9]" onClick={() => {setOpenMenuId(null); setShowFabMenu(false);}}>
      
      {/* INJEKSI CSS HIDE SCROLLBAR */}
      <style>{`.hide-scroll::-webkit-scrollbar { display: none; } .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

      {/* --- PREVIEW GAMBAR & DOKUMEN MODAL (YANG HILANG SEBELUMNYA) --- */}
      {previewMedia && (
        <div className="fixed inset-0 z-[500] bg-[#020617]/95 flex flex-col items-center justify-center p-4 backdrop-blur-md">
          <div className="absolute top-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-10">
            <span className="text-[#e9edef] font-medium truncate max-w-[70%]">{previewMedia.fileName || 'Preview'}</span>
            <div className="flex items-center gap-4">
              <button onClick={() => handleForceDownload(previewMedia.fileData)} className="text-[#e9edef] hover:text-[#10b981] transition p-2 bg-black/40 rounded-full"><Download size={24} /></button>
              <button onClick={() => setPreviewMedia(null)} className="text-[#e9edef] hover:text-red-500 transition p-2 bg-black/40 rounded-full"><X size={24} /></button>
            </div>
          </div>
          <div className="w-full h-full flex items-center justify-center pt-16 pb-4">
            {previewMedia.isImage ? (
              <img src={previewMedia.fileData} alt="Preview" className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-lg" />
            ) : (
              <iframe src={previewMedia.fileData.includes('cloudinary') ? previewMedia.fileData.replace('/upload/', '/upload/fl_attachment/') : previewMedia.fileData} title="File Preview" className="w-full h-full max-w-4xl bg-white rounded-lg border-4 border-[#334155]" />
            )}
          </div>
        </div>
      )}

      {/* --- POP-UP CUSTOM UNTUK BUAT GRUP / JAPRI --- */}
      {modalConfig.type && (
        <div className="fixed inset-0 z-[400] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e293b] w-full max-w-md rounded-2xl border border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-[#334155] flex justify-between items-center bg-[#0f172a]">
              <h2 className="font-bold text-[#f1f5f9] text-lg flex items-center gap-2">
                {modalConfig.type === 'group' ? <Users className="text-[#3b82f6]"/> : <User className="text-[#10b981]"/>}
                {modalConfig.type === 'group' ? 'Buat Grup Baru' : 'Mulai Obrolan Baru'}
              </h2>
              <button onClick={() => {setModalConfig({type:null}); setNewGroupName('');}} className="text-[#94a3b8] hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto hide-scroll">
              {modalConfig.type === 'group' ? (
                <div>
                  <label className="block text-sm text-[#94a3b8] mb-2">Nama Grup</label>
                  <input type="text" autoFocus value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Ketik nama grup..." className="w-full bg-[#0f172a] border border-[#334155] text-white px-4 py-3 rounded-xl outline-none focus:border-[#3b82f6]" />
                  <button onClick={submitNewGroup} className="w-full mt-6 bg-[#3b82f6] text-white py-3 rounded-xl font-medium hover:bg-[#2563eb] transition">Buat Grup</button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center bg-[#0f172a] rounded-xl px-4 py-2 border border-[#334155] mb-4">
                    <Search size={16} className="text-[#64748b]" />
                    <input type="text" value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Cari kontak atau email..." className="bg-transparent border-none outline-none text-sm text-white w-full ml-3" />
                  </div>
                  <label className="block text-xs text-[#94a3b8] mb-2 uppercase tracking-wider font-semibold">Daftar Kontak ({filteredContacts.length})</label>
                  {filteredContacts.length === 0 ? (
                    <div className="text-center text-[#64748b] py-6 text-sm">Tidak ada kontak yang cocok.</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {filteredContacts.map(c => (
                        <div key={c.uid} onClick={() => submitNewJapri(c)} className="flex items-center gap-3 p-3 bg-[#0f172a] hover:bg-[#334155] border border-[#334155] rounded-xl cursor-pointer transition">
                          <img src={c.photo} alt={c.name} className="w-10 h-10 rounded-full" />
                          <div className="flex-1 min-w-0"><p className="font-medium text-[#f1f5f9] truncate text-sm">{c.name}</p><p className="text-xs text-[#64748b] truncate">{c.email}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. LAYAR PRA-KIRIM FILE */}
      {pendingUploadFile && (
        <div className="fixed inset-0 z-[300] bg-[#020617]/95 flex flex-col backdrop-blur-sm">
           <div className="h-16 flex items-center px-4 shrink-0 border-b border-[#334155]">
            <button onClick={() => {setPendingUploadFile(null); setPendingPreviewUrl(null);}} className="text-[#94a3b8] p-2 hover:bg-[#1e293b] rounded-full transition"><X size={26} /></button>
            <span className="text-[#f1f5f9] ml-4 font-semibold">Kirim ke {activeGroup?.name}</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden">
            {pendingPreviewUrl ? <img src={pendingPreviewUrl} alt="Preview" className="max-w-full max-h-full rounded-lg drop-shadow-2xl" /> : <FileText size={100} className="text-[#475569]" />}
          </div>
          <div className="bg-[#0f172a] px-4 py-4 flex items-end gap-3 border-t border-[#334155]">
            <textarea value={uploadCaption} onChange={(e) => setUploadCaption(e.target.value)} rows={1} placeholder="Tambahkan keterangan..." className="flex-1 py-3 px-5 bg-[#1e293b] rounded-xl border border-[#334155] outline-none text-[#f1f5f9] hide-scroll" />
            <button onClick={confirmUpload} className="bg-[#10b981] p-3.5 rounded-xl hover:bg-[#059669] transition"><Send size={24} className="text-white" /></button>
          </div>
        </div>
      )}

      {/* 3. SIDEBAR KIRI (DENGAN FAB PLUS MENU) */}
      <div className={`${isMobileChatOpen ? 'hidden md:flex' : 'flex'} w-full md:w-[30%] lg:w-[25%] border-r border-[#1e293b] bg-[#0f172a] flex-col h-full z-10 shrink-0 shadow-2xl relative`}>
        
        {/* FAB Tombol (+) ala WhatsApp */}
        <div className="absolute bottom-6 right-6 z-50">
          {showFabMenu && (
             <div className="absolute bottom-16 right-0 bg-[#1e293b] rounded-xl shadow-2xl border border-[#334155] p-2 flex flex-col gap-1 w-44 mb-2 origin-bottom-right animate-in fade-in zoom-in duration-200">
               <button onClick={(e) => {e.stopPropagation(); setModalConfig({type: 'japri'}); setShowFabMenu(false);}} className="flex items-center gap-3 px-3 py-2 hover:bg-[#334155] rounded-lg text-sm text-[#f1f5f9] font-medium"><User size={16} className="text-[#10b981]"/> Chat Pribadi Baru</button>
               <button onClick={(e) => {e.stopPropagation(); setModalConfig({type: 'group'}); setShowFabMenu(false);}} className="flex items-center gap-3 px-3 py-2 hover:bg-[#334155] rounded-lg text-sm text-[#f1f5f9] font-medium"><Users size={16} className="text-[#3b82f6]"/> Buat Grup Baru</button>
             </div>
          )}
          <button onClick={(e) => {e.stopPropagation(); setShowFabMenu(!showFabMenu);}} className="bg-[#10b981] p-4 rounded-2xl shadow-[0_4px_20px_rgba(16,185,129,0.4)] hover:bg-[#059669] transition-transform hover:scale-105 active:scale-95">
            <Plus size={26} className={`text-white transition-transform duration-300 ${showFabMenu ? 'rotate-45' : 'rotate-0'}`} />
          </button>
        </div>

        <div className="bg-[#0f172a] h-16 flex items-center justify-between px-5 shrink-0 border-b border-[#1e293b]">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src={user.photoURL} alt="Profil" className="w-9 h-9 rounded-xl shadow-md border border-[#334155]" />
            <div>
              <div className="font-bold text-[#f1f5f9] truncate text-sm">{user.displayName}</div>
              <div className="text-[10px] text-[#10b981] font-medium">{isAdmin ? 'Administrator' : 'Online'}</div>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="hover:bg-[#1e293b] p-2 rounded-xl transition-colors text-[#ef4444]" title="Keluar"><LogOut size={18} /></button>
        </div>
        
        <div className="p-3 bg-[#0f172a] shrink-0 border-b border-[#1e293b]">
           <div className="bg-[#1e293b] flex items-center rounded-xl px-4 py-2 border border-[#334155] focus-within:border-[#3b82f6] transition-colors">
              <Search size={16} className="text-[#64748b] shrink-0" />
              <input type="text" value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)} placeholder="Cari obrolan..." className="bg-transparent border-none outline-none ml-3 w-full text-sm text-[#f1f5f9] placeholder-[#64748b]" />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#0f172a] p-2 hide-scroll">
          {filteredRooms.length === 0 && <p className="text-center text-[#64748b] text-sm mt-4">Obrolan tidak ditemukan.</p>}
          {filteredRooms.map(room => (
            <div key={room.id} onClick={() => { setActiveGroup(room); setIsMobileChatOpen(true); }} className={`flex items-center p-3 mb-1 cursor-pointer rounded-xl transition-all ${activeGroup?.id === room.id ? 'bg-[#1e293b] border border-[#334155]' : 'hover:bg-[#1e293b]/50 border border-transparent'}`}>
              <div className="relative">
                <img src={room.avatar} alt={room.name} className={`w-11 h-11 object-cover mr-3 ${room.type === 'private' ? 'rounded-full' : 'rounded-xl'}`} />
                {room.type === 'private' && <div className="absolute -bottom-0.5 -right-0.5 bg-[#10b981] w-3 h-3 rounded-full border-2 border-[#0f172a]"></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#f8fafc] truncate text-[14px]">{room.name}</h3>
                <p className="text-[12px] text-[#64748b] truncate">{room.type === 'private' ? 'Pesan Pribadi' : 'Grup Chat'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. AREA CHAT TENGAH */}
      <div className={`${isMobileChatOpen && !showGroupInfo ? 'flex' : 'hidden md:flex'} flex-1 flex-col w-full h-full bg-[#020617] relative`}>
        
        {!activeGroup ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0f172a]">
             <div className="w-20 h-20 bg-[#1e293b] rounded-3xl mb-6 shadow-2xl flex items-center justify-center border border-[#334155]"><MessageSquare className="text-[#3b82f6]" size={36} /></div>
             <h1 className="text-xl font-bold text-[#f1f5f9] mb-2">Nexus Enterprise</h1>
             <p className="text-[#64748b] text-sm">Pilih percakapan untuk memulai.</p>
          </div>
        ) : (
          <>
            <div className="bg-[#0f172a]/90 backdrop-blur-md h-16 flex items-center justify-between px-5 shrink-0 z-20 border-b border-[#1e293b]">
              <div className="flex items-center min-w-0 flex-1 cursor-pointer" onClick={() => setShowGroupInfo(!showGroupInfo)}>
                <button onClick={(e) => { e.stopPropagation(); setIsMobileChatOpen(false); }} className="md:hidden mr-3 text-[#94a3b8]"><ArrowLeft size={22} /></button>
                <img src={activeGroup.avatar} alt="Avatar" className={`w-9 h-9 object-cover mr-3 shadow-sm ${activeGroup.type === 'private' ? 'rounded-full' : 'rounded-xl'}`} />
                <div className="truncate">
                  <h2 className="font-bold text-[#f8fafc] truncate text-[15px] flex items-center gap-2">
                    {activeGroup.name}
                    {activeGroup.type === 'private' && <span className="px-1.5 py-0.5 bg-[#10b981]/20 text-[#10b981] text-[9px] rounded uppercase">Private</span>}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowChatSearch(!showChatSearch)} className={`p-2 rounded-xl transition-colors ${showChatSearch ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'text-[#94a3b8] hover:bg-[#1e293b]'}`} title="Cari pesan"><Search size={18} /></button>
              </div>
            </div>

            {/* Kotak Pencarian dalam Obrolan */}
            {showChatSearch && (
              <div className="bg-[#0f172a] px-5 py-3 border-b border-[#1e293b] flex items-center shrink-0 z-10 shadow-md">
                <div className="flex-1 bg-[#1e293b] rounded-xl flex items-center px-4 py-2 border border-[#334155] focus-within:border-[#3b82f6] transition-colors">
                  <Search size={16} className="text-[#64748b] shrink-0" />
                  <input type="text" autoFocus value={chatSearch} onChange={e => setChatSearch(e.target.value)} placeholder="Cari di dalam percakapan ini..." className="w-full bg-transparent border-none outline-none ml-3 text-sm text-[#f1f5f9] placeholder-[#64748b]" />
                </div>
                <button onClick={() => {setShowChatSearch(false); setChatSearch('');}} className="ml-3 text-[#94a3b8] hover:text-white"><X size={20}/></button>
              </div>
            )}

            {isSelectionMode && (
              <div className="bg-[#1e293b] px-4 py-2 absolute top-16 left-0 right-0 z-30 flex items-center justify-between border-b border-[#334155] shadow-lg">
                 <span className="text-[#3b82f6] font-semibold text-sm">{selectedMessages.length} pesan dipilih</span>
                 <button onClick={() => { setIsSelectionMode(false); setSelectedMessages([]); }} className="text-[#94a3b8] hover:text-white text-sm">Batal</button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 md:px-12 flex flex-col gap-2 relative z-0 pb-4 hide-scroll">
              {filteredMessages.length === 0 && chatSearch && <div className="text-center text-[#64748b] mt-10 text-sm">Pesan tidak ditemukan.</div>}
              {filteredMessages.map((msg) => {
                const isMe = msg.uid === user.uid;
                const isMenuOpen = openMenuId === msg.id;
                const isSelected = selectedMessages.includes(msg.id);

                return (
                  <div key={msg.id} className={`flex items-center relative ${isMe ? 'justify-end' : 'justify-start'} mt-1 group`}>
                    {isSelectionMode && (
                      <div onClick={() => toggleSelection(msg.id)} className="mr-3 cursor-pointer text-[#3b82f6] shrink-0">
                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} className="text-[#475569]" />}
                      </div>
                    )}
                    <div onClick={() => isSelectionMode && toggleSelection(msg.id)} className={`flex flex-col relative max-w-[85%] md:max-w-[70%] ${isSelectionMode ? 'cursor-pointer' : ''}`}>
                      <div className={`p-2.5 rounded-2xl shadow-sm text-[14.5px] relative leading-relaxed border
                        ${isMe ? 'bg-[#10b981]/10 border-[#10b981]/20 text-[#f1f5f9] rounded-br-sm' : 'bg-[#1e293b] border-[#334155] text-[#f1f5f9] rounded-bl-sm'}
                        ${isSelected ? 'ring-2 ring-[#3b82f6]' : ''}
                      `}>
                        {!isMe && activeGroup.type !== 'private' && <div className="text-[11px] font-bold text-[#3b82f6] mb-1">{msg.senderName}</div>}
                        
                        {/* RENDER GAMBAR DAN DOKUMEN DALAM BUBBLE */}
                        {msg.isImage && (
                          <div className="mb-2 relative cursor-pointer group/media" onClick={() => !isSelectionMode && setPreviewMedia(msg)}>
                            <img src={msg.fileData} className="max-w-full md:max-w-[280px] rounded-lg object-cover border border-[#334155]" alt="Lampiran" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 flex items-center justify-center rounded-lg transition-opacity"><Search className="text-white" size={24} /></div>
                          </div>
                        )}
                        {!msg.isImage && msg.fileData && (
                          <div onClick={() => !isSelectionMode && setPreviewMedia(msg)} className="flex items-center gap-3 bg-[#0f172a] p-3 rounded-xl mb-2 border border-[#334155] hover:border-[#3b82f6]/50 transition cursor-pointer">
                            <div className="w-9 h-9 bg-[#334155] rounded-lg flex items-center justify-center shrink-0 shadow-inner">
                              <FileText size={18} className="text-[#10b981]" />
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-medium text-[#f1f5f9] text-[13px] truncate">{msg.fileName}</p>
                              <p className="text-[10px] text-[#64748b] mt-0.5">Ketuk untuk membuka</p>
                            </div>
                            <button onClick={(e) => {e.stopPropagation(); handleForceDownload(msg.fileData)}} className="p-2 bg-[#1e293b] rounded-lg hover:bg-[#334155] transition text-[#94a3b8] shrink-0" title="Unduh File"><Download size={16}/></button>
                          </div>
                        )}

                        {/* Dropdown Menu Toggle */}
                        {!isSelectionMode && (
                          <div onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : msg.id); }} className={`absolute top-1.5 right-1.5 cursor-pointer p-1 rounded-md z-20 md:opacity-0 md:group-hover:opacity-100 ${isMenuOpen ? 'opacity-100 bg-[#334155]' : 'hover:bg-[#334155]'}`}>
                            <ChevronDown size={16} className="text-[#94a3b8]" />
                          </div>
                        )}

                        {/* Menu Popup Pesan */}
                        {isMenuOpen && (
                          <div onClick={(e) => e.stopPropagation()} className={`absolute top-7 ${isMe ? 'right-0' : 'left-5'} bg-[#0f172a] border border-[#334155] shadow-2xl rounded-xl py-2 w-44 z-[100]`}>
                            <button onClick={() => handleForwardToWA([msg])} className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-3"><Share2 size={14} className="text-[#3b82f6]" /> Teruskan ke WA</button>
                            <button onClick={() => {setIsSelectionMode(true); setSelectedMessages([msg.id]); setOpenMenuId(null);}} className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-3 border-b border-[#334155]"><CheckSquare size={14} className="text-[#10b981]"/> Pilih Pesan</button>
                            {isMe && <button onClick={() => startEditing(msg)} className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-3"><Edit2 size={14} className="text-[#eab308]" /> Edit Pesan</button>}
                            {(isMe || isAdmin) && <button onClick={() => handleDeleteMessage(msg.id)} className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#ef4444] hover:bg-[#1e293b] flex items-center gap-3"><Trash2 size={14} /> Hapus Pesan</button>}
                          </div>
                        )}
                        
                        {msg.text && <div dangerouslySetInnerHTML={formatText(msg.text)} className="pr-6 text-[14px]" />}
                        
                        <div className="flex items-center justify-end gap-1 mt-1">
                          {msg.isEdited && <span className="text-[9px] text-[#64748b] italic">diedit</span>}
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
              <div className="bg-[#0f172a]/90 backdrop-blur-md px-5 py-3 flex justify-between items-center z-10 border-t border-[#1e293b]">
                <button onClick={() => { setIsSelectionMode(false); setSelectedMessages([]); }} className="text-[#94a3b8] text-sm font-medium p-2 hover:bg-[#1e293b] rounded-lg">Batal</button>
                <div className="flex gap-2">
                  <button onClick={() => handleForwardToWA(messages.filter(m => selectedMessages.includes(m.id)))} disabled={selectedMessages.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 hover:bg-[#3b82f6]/20 disabled:opacity-50">
                    <Share2 size={16} /> Teruskan
                  </button>
                  <button onClick={() => handleDeleteMessage()} disabled={selectedMessages.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/20 disabled:opacity-50">
                    <Trash2 size={16} /> Hapus Massal
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="bg-[#0f172a]/90 backdrop-blur-md px-4 md:px-6 py-3 flex items-end gap-2 shrink-0 z-10 border-t border-[#1e293b]">
                <input type="file" ref={fileInputRef} onChange={handleFileSelection} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[#94a3b8] hover:text-[#3b82f6] p-2.5 transition-colors bg-[#1e293b] rounded-xl border border-[#334155] mb-0.5">
                  <Paperclip size={18} />
                </button>
                
                <div className="flex-1 bg-[#1e293b] rounded-xl border border-[#334155] flex items-center pl-3 focus-within:border-[#3b82f6] transition-colors shadow-inner">
                  <textarea ref={textareaRef} value={newMessage} onChange={handleInputResize} onKeyDown={handleKeyDown} rows={1} placeholder={editingMessage ? "Edit pesan..." : "Ketik pesan rahasia..."} className="flex-1 py-2.5 bg-transparent border-none outline-none resize-none text-[#f1f5f9] placeholder-[#64748b] text-[14px] hide-scroll" />
                </div>
                <button type="submit" disabled={!newMessage.trim()} className={`p-2.5 shrink-0 rounded-xl transition-all shadow-lg ${newMessage.trim() ? "bg-gradient-to-r from-[#10b981] to-[#059669] text-white" : "bg-[#1e293b] text-[#64748b] border border-[#334155]"}`}>
                  <Send size={18} className={newMessage.trim() ? "ml-0.5" : ""} />
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* 5. SIDEBAR INFO GRUP KANAN */}
      {showGroupInfo && activeGroup && (
        <div className={`w-full md:w-[320px] lg:w-[350px] border-l border-[#1e293b] bg-[#0f172a] flex-col h-full z-20 absolute right-0 md:relative ${showGroupInfo ? 'flex' : 'hidden'} shadow-2xl`}>
          <div className="bg-[#0f172a] h-16 flex items-center px-5 shrink-0 border-b border-[#1e293b] gap-3">
            <button onClick={() => setShowGroupInfo(false)} className="text-[#94a3b8] hover:bg-[#1e293b] p-1.5 rounded-lg"><X size={18} /></button>
            <span className="text-[#f1f5f9] font-bold text-[14px]">Detail Percakapan</span>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#020617] hide-scroll">
            <div className="flex flex-col items-center py-8 bg-[#0f172a] mb-2 border-b border-[#1e293b]">
              <div className="relative group cursor-pointer mb-4">
                <img src={activeGroup.avatar} alt="Avatar" className={`w-24 h-24 object-cover border-4 border-[#1e293b] shadow-xl ${activeGroup.type === 'private' ? 'rounded-full' : 'rounded-2xl'}`} />
                {(isAdmin || activeGroup.createdBy === user.uid) && (
                  <div onClick={() => groupPhotoInputRef.current?.click()} className="absolute inset-0 bg-black/50 rounded-2xl md:opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <Camera className="text-white" size={24} />
                  </div>
                )}
                <input type="file" ref={groupPhotoInputRef} onChange={handleUpdateGroupPhoto} accept="image/*" className="hidden" />
              </div>
              <div className="flex items-center gap-2 px-6 text-center">
                <h2 className="text-[#f8fafc] text-lg font-bold truncate">{activeGroup.name}</h2>
                {(isAdmin || activeGroup.createdBy === user.uid) && (
                  <button onClick={handleEditGroupName} className="text-[#3b82f6] hover:bg-[#1e293b] p-1 rounded-md shrink-0"><Edit3 size={14} /></button>
                )}
              </div>
            </div>
            
            <div className="bg-[#0f172a] p-5 min-h-[300px] border-t border-[#1e293b]">
              <h3 className="text-[#f1f5f9] font-semibold text-xs mb-3 flex items-center gap-2"><FileText size={14} className="text-[#3b82f6]"/> File Terkirim</h3>
              <div className="flex flex-col gap-2">
                {messages.filter(m => m.fileData).length === 0 && <p className="text-[#64748b] text-xs">Belum ada file.</p>}
                {messages.filter(m => m.fileData).map(m => (
                  <div key={m.id} onClick={() => setPreviewMedia(m)} className="flex items-center gap-3 p-3 bg-[#1e293b] rounded-xl border border-[#334155] hover:border-[#3b82f6]/50 transition cursor-pointer">
                    <div className="w-10 h-10 bg-[#334155] rounded-lg flex items-center justify-center shrink-0">
                      {m.isImage ? <img src={m.fileData} className="w-full h-full object-cover rounded-lg" /> : <FileText size={16} className="text-[#10b981]" />}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium text-[#f1f5f9] text-[13px] truncate">{m.fileName}</p>
                    </div>
                    <button onClick={(e) => {e.stopPropagation(); handleForceDownload(m.fileData)}} className="p-2 bg-[#0f172a] rounded-lg hover:bg-[#334155] transition text-[#94a3b8] shrink-0" title="Unduh File"><Download size={16}/></button>
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