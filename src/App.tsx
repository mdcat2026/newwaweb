// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Send, LogOut, Paperclip, Search, CheckCheck, FileText, ArrowLeft, Download, Smile, ChevronDown, Trash2, Edit2, Share2, X, MoreVertical, MessageSquare } from 'lucide-react';

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
  const [isUploading, setIsUploading] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

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
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } 
    catch (error) { console.error("Error login:", error); }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;
    
    if (editingMessage) {
      await updateDoc(doc(db, `messages_${activeGroup.id}`, editingMessage.id), {
        text: newMessage,
        isEdited: true
      });
      setEditingMessage(null);
    } else {
      await addDoc(collection(db, `messages_${activeGroup.id}`), {
        text: newMessage,
        uid: user.uid,
        senderName: user.displayName,
        senderAvatar: user.photoURL,
        timestamp: serverTimestamp(),
        isEdited: false
      });
    }
    
    setNewMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleDeleteMessage = async (msgId) => {
    if (window.confirm("Hapus pesan ini secara permanen?")) {
      await deleteDoc(doc(db, `messages_${activeGroup.id}`, msgId));
      setOpenMenuId(null);
    }
  };

  const startEditing = (msg) => {
    setEditingMessage(msg);
    setNewMessage(msg.text);
    setOpenMenuId(null);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setNewMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    const isMobile = window.innerWidth <= 768;
    if (e.key === 'Enter' && !e.shiftKey) {
      if (!isMobile) {
        e.preventDefault();
        handleSendMessage(e);
      }
    }
  };

  const handleInputResize = (e) => {
    setNewMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleFileProcessing = async (file) => {
    if (file.size > 800000) {
      alert("Batas sementara 800KB.");
      return;
    }
    setIsUploading(true);
    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      try {
        await addDoc(collection(db, `messages_${activeGroup.id}`), {
          text: '', 
          fileData: reader.result,
          fileName: file.name || 'Lampiran',
          isImage: isImage,
          uid: user.uid,
          senderName: user.displayName,
          senderAvatar: user.photoURL,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        alert("Gagal mengirim file.");
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const formatText = (text) => {
    if (!text) return { __html: '' };
    let formatted = text
      .replace(/</g, "&lt;").replace(/>/g, "&gt;") 
      .replace(/\*(.*?)\*/g, "<strong>$1</strong>") 
      .replace(/_(.*?)_/g, "<em>$1</em>")
      .replace(/\n/g, "<br />");
    return { __html: formatted };
  };

  const handleForwardToWA = (msg) => {
    let waText = msg.text || '';
    if (msg.fileName) waText = `*[File: ${msg.fileName}]* ${waText}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`, '_blank');
    setOpenMenuId(null);
  };

  // --- HALAMAN LOGIN ---
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#111b21]">
        <div className="bg-[#202c33] p-10 rounded-xl shadow-2xl text-center max-w-sm w-full mx-4 border border-[#2a3942]">
          <h1 className="text-3xl font-bold text-[#00a884] mb-2">Web Chat</h1>
          <p className="mb-8 text-[#8696a0]">Silakan login untuk masuk ke grup.</p>
          <button onClick={handleLogin} className="w-full bg-[#00a884] text-[#111b21] py-3 rounded-lg hover:bg-[#008f6f] transition font-bold shadow-md">
            Login dengan Google
          </button>
        </div>
      </div>
    );
  }

  // --- HALAMAN CHAT UTAMA (DARK MODE) ---
  return (
    <div className="flex h-[100dvh] bg-[#111b21] font-sans overflow-hidden text-[#e9edef]" onClick={() => setOpenMenuId(null)}>
      
      {/* SIDEBAR KIRI */}
      <div className={`${isMobileChatOpen ? 'hidden md:flex' : 'flex'} w-full md:w-[30%] lg:w-[25%] border-r border-[#222d34] bg-[#111b21] flex-col h-full z-10`}>
        
        {/* Header Profil */}
        <div className="bg-[#202c33] h-16 flex items-center justify-between px-4 py-2 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden cursor-pointer">
            <img src={user.photoURL} alt="Profil" className="w-10 h-10 rounded-full shrink-0" />
            <span className="font-semibold text-[#e9edef] truncate">{user.displayName}</span>
          </div>
          <div className="flex items-center gap-3 text-[#aebac1]">
            <MessageSquare size={20} className="cursor-pointer hover:text-[#e9edef]" />
            <MoreVertical size={20} className="cursor-pointer hover:text-[#e9edef]" />
            <button onClick={() => signOut(auth)} title="Logout" className="hover:text-red-400 ml-1">
              <LogOut size={18} />
            </button>
          </div>
        </div>
        
        {/* Bar Pencarian */}
        <div className="p-2 border-b border-[#222d34] bg-[#111b21] shrink-0">
          <div className="bg-[#202c33] flex items-center rounded-lg px-4 py-1.5 border-b-2 border-transparent focus-within:border-[#00a884] transition-colors">
            <Search size={18} className="text-[#8696a0] shrink-0" />
            <input type="text" placeholder="Cari atau mulai obrolan baru" className="bg-transparent border-none outline-none ml-5 w-full text-sm text-[#e9edef] placeholder-[#8696a0]" />
          </div>
        </div>

        {/* Daftar Grup */}
        <div className="flex-1 overflow-y-auto bg-[#111b21]">
          {GROUPS.map(group => (
            <div 
              key={group.id} 
              onClick={() => { setActiveGroup(group); setIsMobileChatOpen(true); }}
              className={`flex items-center px-3 py-3 cursor-pointer hover:bg-[#202c33] transition ${activeGroup.id === group.id ? 'bg-[#2a3942]' : ''}`}
            >
              <img src={group.avatar} alt={group.name} className="w-12 h-12 rounded-full mr-4 shrink-0" />
              <div className="flex-1 border-b border-[#222d34] pb-4 truncate pt-1">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-medium text-[#e9edef] truncate text-[17px]">{group.name}</h3>
                  {/* Waktu dummy untuk estetika UI */}
                  <span className="text-xs text-[#8696a0]">13:45</span>
                </div>
                <p className="text-sm text-[#8696a0] truncate">Ketuk untuk melihat pesan...</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AREA CHAT KANAN */}
      <div className={`${isMobileChatOpen ? 'flex' : 'hidden md:flex'} flex-1 flex-col w-full h-full bg-[#0b141a] relative`} style={{ backgroundImage: "url('https://static.whatsapp.net/rsrc.php/v3/yl/r/gi_DckOUM5a.png')", opacity: 1, backgroundRepeat: 'repeat', backgroundSize: '400px' }}>
        
        {/* Header Chat Kanan */}
        <div className="bg-[#202c33] h-16 flex items-center justify-between px-4 shrink-0 z-10 shadow-sm border-l border-[#222d34]">
          <div className="flex items-center">
            <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden mr-3 text-[#aebac1] p-1">
              <ArrowLeft size={24} />
            </button>
            <img src={activeGroup.avatar} alt="Avatar" className="w-10 h-10 rounded-full mr-4 shrink-0 cursor-pointer" />
            <div>
              <h2 className="font-medium text-[#e9edef] truncate text-[16px]">{activeGroup.name}</h2>
              <p className="text-xs text-[#8696a0] truncate">klik di sini untuk info grup</p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-[#aebac1]">
            <Search size={20} className="cursor-pointer hover:text-[#e9edef]" />
            <MoreVertical size={20} className="cursor-pointer hover:text-[#e9edef]" />
          </div>
        </div>

        {/* Ruang Pesan */}
        <div className="flex-1 overflow-y-auto p-4 md:px-16 lg:px-24 flex flex-col gap-1 relative z-0 pb-4">
          {messages.map((msg, index) => {
            const isMe = msg.uid === user.uid;
            const isMenuOpen = openMenuId === msg.id;
            
            // Logika untuk merapatkan pesan dari pengirim yang sama
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const isSameSenderAsPrev = prevMsg && prevMsg.uid === msg.uid;
            const marginTop = isSameSenderAsPrev ? 'mt-0' : 'mt-3';

            return (
              <div key={msg.id} className={`flex flex-col relative group max-w-[85%] md:max-w-[70%] lg:max-w-[65%] ${marginTop} ${isMe ? 'self-end' : 'self-start'}`}>
                
                {(!isMe && !isSameSenderAsPrev) && <span className="text-[12px] font-medium text-[#eeb056] ml-2 mb-1">{msg.senderName}</span>}
                
                {/* Balon Chat */}
                <div className={`p-1.5 px-2.5 rounded-lg shadow-sm text-[15px] relative break-words leading-[1.3] 
                  ${isMe ? 'bg-[#005c4b] text-[#e9edef]' : 'bg-[#202c33] text-[#e9edef]'}
                  ${!isSameSenderAsPrev ? (isMe ? 'rounded-tr-none' : 'rounded-tl-none') : ''}
                `}>
                  
                  {/* Panah Dropdown */}
                  <div 
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : msg.id); }}
                    className={`absolute top-1 right-1 cursor-pointer p-1 rounded-bl-lg rounded-tr-lg z-20 transition-opacity
                      ${isMe ? 'bg-gradient-to-l from-[#005c4b] via-[#005c4b]' : 'bg-gradient-to-l from-[#202c33] via-[#202c33]'}
                      md:opacity-0 md:group-hover:opacity-100 ${isMenuOpen ? 'opacity-100' : ''} to-transparent
                    `}
                  >
                    <ChevronDown size={22} className="text-[#8696a0]" />
                  </div>

                  {/* Menu Dropdown Popup */}
                  {isMenuOpen && (
                    <div onClick={(e) => e.stopPropagation()} className={`absolute top-8 ${isMe ? 'right-0' : 'left-5'} bg-[#233138] border border-[#2a3942] shadow-2xl rounded py-2 w-44 z-[100]`}>
                      <button onClick={() => handleForwardToWA(msg)} className="w-full text-left px-5 py-2.5 text-[14.5px] text-[#d1d7db] hover:bg-[#182229] transition-colors flex items-center gap-3">
                        <Share2 size={18} /> Teruskan (WA)
                      </button>
                      {isMe && (
                        <>
                          <button onClick={() => startEditing(msg)} className="w-full text-left px-5 py-2.5 text-[14.5px] text-[#d1d7db] hover:bg-[#182229] transition-colors flex items-center gap-3">
                            <Edit2 size={18} /> Edit pesan
                          </button>
                          <button onClick={() => handleDeleteMessage(msg.id)} className="w-full text-left px-5 py-2.5 text-[14.5px] text-[#d1d7db] hover:bg-[#182229] transition-colors flex items-center gap-3">
                            <Trash2 size={18} /> Hapus pesan
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* File / Gambar */}
                  {msg.isImage && (
                    <div className="relative group/img mt-0.5 mx-0.5">
                      <img src={msg.fileData} alt="attachment" className="max-w-full md:max-w-[320px] rounded mb-1 object-cover" />
                      <a href={msg.fileData} download={msg.fileName} className="absolute bottom-2 right-2 p-2 bg-black/60 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition shadow-lg hover:bg-[#00a884]">
                        <Download size={18} />
                      </a>
                    </div>
                  )}
                  {!msg.isImage && msg.fileData && (
                    <div className="flex items-center gap-3 bg-[#1e2a30] p-3 rounded mb-1 mt-1 border border-[#2a3942]">
                      <div className="p-2 bg-[#ff8f6e] rounded text-white shrink-0"><FileText size={20} /></div>
                      <div className="flex-1 min-w-0"><p className="font-medium truncate text-sm text-[#e9edef]">{msg.fileName}</p></div>
                      <a href={msg.fileData} download={msg.fileName} className="p-2 bg-transparent hover:bg-[#2a3942] rounded-full transition-colors shrink-0">
                        <Download size={20} className="text-[#aebac1]" />
                      </a>
                    </div>
                  )}
                  
                  {/* Teks Pesan */}
                  {msg.text && (
                    <div dangerouslySetInnerHTML={formatText(msg.text)} className={`mt-0.5 px-1 ${msg.text.length < 10 && !msg.isImage ? 'pr-12' : 'pr-3'} text-[14.2px]`} />
                  )}
                  
                  {/* Waktu & Centang */}
                  <div className={`flex items-center justify-end gap-1 ${msg.text && msg.text.length < 10 && !msg.isImage ? 'absolute bottom-1 right-2' : 'mt-1 mr-1 float-right'}`}>
                    {msg.isEdited && <span className="text-[11px] text-[#8696a0] italic mr-1 text-opacity-80">diedit</span>}
                    <span className="text-[11px] text-[#8696a0] text-opacity-90">
                      {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </span>
                    {isMe && <CheckCheck size={16} className="text-[#53bdeb]" />}
                  </div>
                  
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Indikator Edit */}
        {editingMessage && (
          <div className="bg-[#202c33] px-5 py-2.5 border-l-4 border-[#00a884] flex justify-between items-center text-sm z-10 shadow-md">
            <div>
              <span className="font-semibold text-[#00a884]">Edit pesan</span>
              <p className="text-[#8696a0] truncate max-w-sm mt-0.5">{editingMessage.text}</p>
            </div>
            <button onClick={cancelEditing} className="text-[#8696a0] hover:text-[#e9edef] p-1">
              <X size={24} />
            </button>
          </div>
        )}

        {/* Form Input Bawah */}
        <form onSubmit={handleSendMessage} className="bg-[#202c33] px-4 py-2.5 flex items-end gap-3 shrink-0 z-10">
          
          <div className="flex gap-1 shrink-0 mb-1">
            <button type="button" onClick={() => alert("Gunakan emoji bawaan HP/PC Anda")} className="text-[#8696a0] hover:text-[#e9edef] p-2 transition-colors rounded-full">
              <Smile size={26} />
            </button>
            <input type="file" ref={fileInputRef} onChange={(e) => { if(e.target.files[0]) handleFileProcessing(e.target.files[0]); e.target.value=''; }} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading || editingMessage} className={`text-[#8696a0] hover:text-[#e9edef] p-2 transition-colors rounded-full ${(isUploading || editingMessage) ? 'opacity-50' : ''}`}>
              {isUploading ? <div className="w-6 h-6 border-2 border-[#8696a0] border-t-transparent rounded-full animate-spin"></div> : <Paperclip size={24} className="transform -rotate-45" />}
            </button>
          </div>
          
          <div className="flex-1 bg-[#2a3942] rounded-lg mb-1 flex items-center pl-4 pr-1 focus-within:bg-[#2a3942]">
            <textarea 
              ref={textareaRef}
              value={newMessage}
              onChange={handleInputResize}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={editingMessage ? "Edit pesan Anda" : "Ketik pesan"}
              className="flex-1 py-2.5 bg-transparent border-none outline-none resize-none overflow-y-auto text-[#e9edef] placeholder-[#8696a0] text-[15px]"
            />
          </div>
          
          <button type="submit" disabled={!newMessage.trim()} className="text-[#8696a0] hover:text-[#00a884] p-3 shrink-0 mb-0.5 rounded-full transition-colors">
            <Send size={24} className={newMessage.trim() ? "text-[#00a884]" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
}