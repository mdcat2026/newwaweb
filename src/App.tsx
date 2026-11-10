// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Send, LogOut, Paperclip, Search, CheckCheck, FileText, ArrowLeft, Download, Smile, ChevronDown, Trash2, Edit2, Share2, X } from 'lucide-react';

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
  
  // State untuk menu dropdown dan Edit
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
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Error login:", error);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;
    
    if (editingMessage) {
      // Proses Edit Pesan
      await updateDoc(doc(db, `messages_${activeGroup.id}`, editingMessage.id), {
        text: newMessage,
        isEdited: true
      });
      setEditingMessage(null);
    } else {
      // Proses Kirim Pesan Baru
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
    textareaRef.current?.focus();
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setNewMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    const isMobile = window.innerWidth <= 768;
    // Di Desktop: Enter untuk kirim, Shift+Enter untuk baris baru
    // Di Mobile: Enter untuk baris baru (default keyboard HP)
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
      alert("Batas sementara 800KB. Kita akan segera menggunakan Cloudinary!");
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

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f0f2f5]">
        <div className="bg-white p-10 rounded-xl shadow-xl text-center max-w-sm w-full mx-4">
          <h1 className="text-3xl font-bold text-[#00a884] mb-2">Web Chat</h1>
          <p className="mb-8 text-gray-500">Silakan login untuk masuk ke grup.</p>
          <button onClick={handleLogin} className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f6f] transition font-semibold shadow-md">
            Login dengan Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-[#f0f2f5] font-sans overflow-hidden" onClick={() => setOpenMenuId(null)}>
      
      {/* SIDEBAR GRUP */}
      <div className={`${isMobileChatOpen ? 'hidden md:flex' : 'flex'} w-full md:w-[30%] lg:w-[25%] border-r border-gray-300 bg-white flex-col h-full z-10`}>
        <div className="bg-[#f0f2f5] h-16 flex items-center justify-between px-4 py-2 border-b shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src={user.photoURL} alt="Profil" className="w-10 h-10 rounded-full shrink-0 shadow-sm" />
            <span className="font-semibold text-gray-700 truncate">{user.displayName}</span>
          </div>
          <button onClick={() => signOut(auth)} className="text-gray-500 hover:text-red-500 ml-2 shrink-0 p-2 rounded-full hover:bg-gray-200 transition">
            <LogOut size={20} />
          </button>
        </div>
        
        <div className="p-3 border-b bg-white shrink-0">
          <div className="bg-[#f0f2f5] flex items-center rounded-lg px-4 py-2">
            <Search size={18} className="text-gray-500 shrink-0" />
            <input type="text" placeholder="Cari grup..." className="bg-transparent border-none outline-none ml-3 w-full text-sm" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          {GROUPS.map(group => (
            <div 
              key={group.id} 
              onClick={() => { setActiveGroup(group); setIsMobileChatOpen(true); }}
              className={`flex items-center px-4 py-3 cursor-pointer hover:bg-[#f5f6f6] transition ${activeGroup.id === group.id ? 'bg-[#f0f2f5]' : ''}`}
            >
              <img src={group.avatar} alt={group.name} className="w-12 h-12 rounded-full mr-3 shrink-0 border border-gray-200" />
              <div className="flex-1 border-b border-gray-100 pb-3 truncate pt-1">
                <h3 className="font-medium text-gray-900 truncate text-base">{group.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AREA CHAT */}
      <div className={`${isMobileChatOpen ? 'flex' : 'hidden md:flex'} flex-1 flex-col w-full h-full bg-[#efeae2] relative`} style={{ backgroundImage: "url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')", opacity: 0.95 }}>
        
        {/* Header Chat */}
        <div className="bg-[#f0f2f5] h-16 flex items-center px-4 border-b shrink-0 z-10 shadow-sm">
          <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden mr-3 text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-200">
            <ArrowLeft size={24} />
          </button>
          <img src={activeGroup.avatar} alt="Avatar" className="w-10 h-10 rounded-full mr-3 shrink-0" />
          <h2 className="font-medium text-gray-800 truncate text-lg">{activeGroup.name}</h2>
        </div>

        {/* Area Pesan */}
        <div className="flex-1 overflow-y-auto p-4 md:px-10 flex flex-col gap-3">
          {messages.map((msg) => {
            const isMe = msg.uid === user.uid;
            const isMenuOpen = openMenuId === msg.id;

            return (
              <div key={msg.id} className={`flex flex-col relative group max-w-[85%] md:max-w-[75%] lg:max-w-[60%] ${isMe ? 'self-end' : 'self-start'}`}>
                {!isMe && <span className="text-[11px] font-medium text-gray-500 ml-2 mb-1">{msg.senderName}</span>}
                <div className={`p-2 px-3 rounded-lg shadow text-[15px] relative break-words leading-relaxed ${isMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                  
                  {/* Panah Dropdown Menu */}
                  <div 
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : msg.id); }}
                    className={`absolute top-1 right-1 cursor-pointer p-1 rounded-full bg-gradient-to-l from-[#d9fdd3] (isMe) via-[#d9fdd3] to-transparent z-10 md:opacity-0 md:group-hover:opacity-100 transition-opacity ${isMenuOpen ? 'opacity-100' : ''}`}
                  >
                    <ChevronDown size={20} className="text-gray-500 hover:text-gray-800" />
                  </div>

                  {/* Menu Dropdown Popup */}
                  {isMenuOpen && (
                    <div className={`absolute top-8 ${isMe ? 'right-0' : 'left-0'} bg-white border border-gray-200 shadow-xl rounded-lg py-2 w-40 z-20`}>
                      <button onClick={() => handleForwardToWA(msg)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                        <Share2 size={16} /> Teruskan (WA)
                      </button>
                      {isMe && (
                        <>
                          <button onClick={() => startEditing(msg)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                            <Edit2 size={16} /> Edit Pesan
                          </button>
                          <button onClick={() => handleDeleteMessage(msg.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2">
                            <Trash2 size={16} /> Hapus
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Tampilan Gambar/Dokumen */}
                  {msg.isImage && (
                    <div className="relative group/img mt-2">
                      <img src={msg.fileData} alt="attachment" className="max-w-full md:max-w-[300px] rounded mb-1 object-cover" />
                      <a href={msg.fileData} download={msg.fileName} className="absolute bottom-2 right-2 p-2 bg-black/60 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition shadow-lg hover:bg-black/80">
                        <Download size={18} />
                      </a>
                    </div>
                  )}
                  
                  {!msg.isImage && msg.fileData && (
                    <div className="flex items-center gap-3 bg-black/5 p-3 rounded mb-1 mt-2 text-gray-800 border border-black/10">
                      <FileText size={24} className="text-[#00a884] shrink-0" />
                      <div className="flex-1 min-w-0"><p className="font-medium truncate text-sm">{msg.fileName}</p></div>
                      <a href={msg.fileData} download={msg.fileName} className="p-2 bg-white rounded-full shadow hover:bg-gray-100 shrink-0">
                        <Download size={18} className="text-gray-600" />
                      </a>
                    </div>
                  )}
                  
                  {/* Teks Pesan */}
                  {msg.text && <div dangerouslySetInnerHTML={formatText(msg.text)} className="mt-1 pr-6" />}
                  
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {msg.isEdited && <span className="text-[10px] text-gray-400 italic mr-1">(diedit)</span>}
                    <span className="text-[10px] text-gray-400">
                      {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                    </span>
                    {isMe && <CheckCheck size={15} className="text-[#53bdeb]" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Indikator Mode Edit */}
        {editingMessage && (
          <div className="bg-[#f0f2f5] px-4 py-2 border-t flex justify-between items-center text-sm">
            <div>
              <span className="font-semibold text-[#00a884]">Mengedit pesan</span>
              <p className="text-gray-500 truncate max-w-xs">{editingMessage.text}</p>
            </div>
            <button onClick={cancelEditing} className="text-gray-500 hover:text-gray-800 p-2">
              <X size={20} />
            </button>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="bg-[#f0f2f5] p-2 md:p-3 flex items-end gap-2 shrink-0 z-10 border-t">
          
          <button type="button" onClick={() => textareaRef.current?.focus()} className="text-gray-500 hover:text-gray-700 p-2 md:p-3 shrink-0 mb-1">
            <Smile size={26} />
          </button>

          <input type="file" ref={fileInputRef} onChange={(e) => { if(e.target.files[0]) handleFileProcessing(e.target.files[0]); e.target.value=''; }} className="hidden" />
          
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading || editingMessage} className={`text-gray-500 hover:text-gray-700 p-2 md:p-3 shrink-0 mb-1 ${(isUploading || editingMessage) ? 'opacity-50' : ''}`}>
            {isUploading ? <div className="w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div> : <Paperclip size={26} />}
          </button>
          
          <textarea 
            ref={textareaRef}
            value={newMessage}
            onChange={handleInputResize}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={editingMessage ? "Edit pesan Anda..." : "Ketik pesan..."}
            className="flex-1 py-3 px-4 rounded-xl bg-white border-none outline-none focus:ring-1 focus:ring-gray-300 min-w-0 resize-none overflow-y-auto mb-1 text-[15px]"
          />
          
          <button type="submit" disabled={!newMessage.trim()} className="text-gray-500 hover:text-gray-700 p-2 md:p-3 shrink-0 mb-1">
            <Send size={26} className={newMessage.trim() ? "text-[#00a884]" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
}