// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Send, LogOut, Paperclip, Search, CheckCheck, FileText, ArrowLeft, Download, Smile, ChevronDown, Trash2, Edit2, Share2, X, MoreVertical, MessageSquare, CheckSquare, Square } from 'lucide-react';

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


// 2. TEMPEL KUNCI CLOUDINARY ANDA DI SINI
const CLOUDINARY_CLOUD_NAME = 'm8cnadmw'; // contoh: dxxxyyyzz
const CLOUDINARY_UPLOAD_PRESET = 'Newwaweb'; // contoh: ml_default

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
  
  const [previewMedia, setPreviewMedia] = useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  
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
    setIsSelectionMode(false);
    setSelectedMessages([]);
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

  const handleInputResize = (e) => {
    setNewMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleKeyDown = (e) => {
    const isMobile = window.innerWidth <= 768;
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // --- UPLOAD MENGGUNAKAN CLOUDINARY & TEKS CAPTION ---
  const handleFileProcessing = async (file) => {
    const caption = window.prompt("Ketik teks untuk file ini (kosongkan jika tidak perlu):", "");
    if (caption === null) return; // Batal jika klik Cancel

    if (CLOUDINARY_CLOUD_NAME === 'GANTI_DENGAN_CLOUD_NAME_ANDA') {
      alert("Harap masukkan pengaturan Cloudinary di dalam kode terlebih dahulu!");
      return;
    }

    setIsUploading(true);
    const isImage = file.type.startsWith('image/');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (data.secure_url) {
        await addDoc(collection(db, `messages_${activeGroup.id}`), {
          text: caption || '', 
          fileData: data.secure_url, 
          fileName: file.name || 'Lampiran', 
          isImage: isImage, 
          uid: user.uid, 
          senderName: user.displayName, 
          senderAvatar: user.photoURL, 
          timestamp: serverTimestamp()
        });
      } else {
        throw new Error("Upload gagal");
      }
    } catch (error) {
      console.error("Cloudinary error:", error);
      alert("Gagal mengunggah file ke Cloudinary.");
    }
    setIsUploading(false);
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

  const startSelectionMode = (initialMsgId) => {
    setIsSelectionMode(true);
    setSelectedMessages([initialMsgId]);
    setOpenMenuId(null);
  };

  const toggleSelection = (msgId) => {
    if (selectedMessages.includes(msgId)) {
      const newSelection = selectedMessages.filter(id => id !== msgId);
      setSelectedMessages(newSelection);
      if (newSelection.length === 0) setIsSelectionMode(false);
    } else {
      setSelectedMessages([...selectedMessages, msgId]);
    }
  };

  // --- FORMAT FORWARD WHATSAPP DIPERBAIKI ---
  const executeMultiForward = () => {
    const msgsToForward = messages.filter(m => selectedMessages.includes(m.id));
    
    let finalWaText = msgsToForward.map((m) => {
      let textSegment = m.text || '';
      let header = `Pesan dari *${m.senderName}*:`;
      if (m.fileName) {
          return `${header}\n📁 [File: ${m.fileName}]\n${textSegment}`;
      }
      return `${header}\n${textSegment}`;
    }).join('\n\n━━━━━━━━━━━━━━━\n\n'); 
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(finalWaText)}`, '_blank');
    setIsSelectionMode(false);
    setSelectedMessages([]);
  };

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

  return (
    <div className="flex w-full h-[100dvh] bg-[#111b21] font-sans overflow-hidden text-[#e9edef]" onClick={() => setOpenMenuId(null)}>
      
      {/* KOTAK PRATINJAU / PREVIEW MODAL */}
      {previewMedia && (
        <div className="fixed inset-0 z-[200] bg-[#0b141a]/95 flex flex-col items-center justify-center p-4">
          <div className="absolute top-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
            <span className="text-[#e9edef] font-medium truncate max-w-[70%]">{previewMedia.fileName}</span>
            <div className="flex items-center gap-4">
              <a href={previewMedia.fileData} download={previewMedia.fileName} target="_blank" rel="noopener noreferrer" className="text-[#e9edef] hover:text-[#00a884] transition p-2">
                <Download size={26} />
              </a>
              <button onClick={() => setPreviewMedia(null)} className="text-[#e9edef] hover:text-red-500 transition p-2">
                <X size={30} />
              </button>
            </div>
          </div>
          <div className="w-full h-full flex items-center justify-center pt-16 pb-4">
            {previewMedia.isImage ? (
              <img src={previewMedia.fileData} alt="Preview" className="max-w-full max-h-full object-contain drop-shadow-2xl" />
            ) : (
              <iframe src={previewMedia.fileData} title="File Preview" className="w-full h-full max-w-4xl bg-white rounded-lg" />
            )}
          </div>
        </div>
      )}

      {/* SIDEBAR KIRI */}
      <div className={`${isMobileChatOpen ? 'hidden md:flex' : 'flex'} w-full md:w-[30%] lg:w-[25%] border-r border-[#222d34] bg-[#111b21] flex-col h-full z-10`}>
        <div className="bg-[#202c33] h-16 flex items-center justify-between px-4 py-2 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden cursor-pointer">
            <img src={user.photoURL} alt="Profil" className="w-10 h-10 rounded-full shrink-0" />
            <span className="font-semibold text-[#e9edef] truncate">{user.displayName}</span>
          </div>
          <div className="flex items-center gap-3 text-[#aebac1]">
            <MessageSquare size={20} className="cursor-pointer hover:text-[#e9edef]" />
            <MoreVertical size={20} className="cursor-pointer hover:text-[#e9edef]" />
            <button onClick={() => signOut(auth)} title="Logout" className="hover:text-red-400 ml-1"><LogOut size={18} /></button>
          </div>
        </div>
        
        <div className="p-2 border-b border-[#222d34] bg-[#111b21] shrink-0">
          <div className="bg-[#202c33] flex items-center rounded-lg px-4 py-1.5 border-b-2 border-transparent focus-within:border-[#00a884] transition-colors">
            <Search size={18} className="text-[#8696a0] shrink-0" />
            <input type="text" placeholder="Cari atau mulai obrolan baru" className="bg-transparent border-none outline-none ml-5 w-full text-sm text-[#e9edef] placeholder-[#8696a0]" />
          </div>
        </div>

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
                </div>
                <p className="text-sm text-[#8696a0] truncate">Ketuk untuk melihat pesan...</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AREA CHAT KANAN */}
      <div className={`${isMobileChatOpen ? 'flex' : 'hidden md:flex'} flex-1 flex-col w-full h-full bg-[#0b141a] relative`} style={{ backgroundImage: "url('https://static.whatsapp.net/rsrc.php/v3/yl/r/gi_DckOUM5a.png')", opacity: 1, backgroundRepeat: 'repeat', backgroundSize: '400px' }}>
        
        <div className="bg-[#202c33] h-16 flex items-center justify-between px-4 shrink-0 z-10 shadow-sm border-l border-[#222d34]">
          <div className="flex items-center">
            <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden mr-3 text-[#aebac1] p-1"><ArrowLeft size={24} /></button>
            <img src={activeGroup.avatar} alt="Avatar" className="w-10 h-10 rounded-full mr-4 shrink-0" />
            <div>
              <h2 className="font-medium text-[#e9edef] truncate text-[16px]">{activeGroup.name}</h2>
              <p className="text-xs text-[#8696a0] truncate">klik di sini untuk info grup</p>
            </div>
          </div>
          {isSelectionMode && (
            <div className="flex items-center gap-3 text-[#00a884] font-medium text-sm md:text-base">
              <span>{selectedMessages.length} dipilih</span>
              <button onClick={() => { setIsSelectionMode(false); setSelectedMessages([]); }} className="p-2 hover:bg-[#2a3942] rounded-full transition text-[#aebac1]"><X size={20} /></button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:px-16 lg:px-24 flex flex-col gap-1 relative z-0 pb-4">
          {messages.map((msg, index) => {
            const isMe = msg.uid === user.uid;
            const isMenuOpen = openMenuId === msg.id;
            const isSelected = selectedMessages.includes(msg.id);
            
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const isSameSenderAsPrev = prevMsg && prevMsg.uid === msg.uid;
            const marginTop = isSameSenderAsPrev ? 'mt-0' : 'mt-3';

            return (
              <div key={msg.id} className={`flex items-center relative ${isMe ? 'justify-end' : 'justify-start'} ${marginTop} group`}>
                
                {/* CHECKBOX DIPERBAIKI (Ada background putih) */}
                {isSelectionMode && (
                  <div onClick={() => toggleSelection(msg.id)} className="mr-3 cursor-pointer text-[#00a884] bg-white rounded flex items-center justify-center shrink-0 shadow-sm">
                    {isSelected ? <CheckSquare size={24} /> : <Square size={24} className="text-gray-400" />}
                  </div>
                )}

                <div 
                  onClick={() => isSelectionMode && toggleSelection(msg.id)}
                  className={`flex flex-col relative max-w-[85%] md:max-w-[70%] lg:max-w-[65%] ${isSelectionMode ? 'cursor-pointer' : ''}`}
                >
                  <div className={`p-1.5 px-2.5 rounded-lg shadow-sm text-[15px] relative break-words leading-[1.3] transition-colors
                    ${isMe ? 'bg-[#005c4b] text-[#e9edef]' : 'bg-[#202c33] text-[#e9edef]'}
                    ${!isSameSenderAsPrev ? (isMe ? 'rounded-tr-none' : 'rounded-tl-none') : ''}
                    ${isSelected ? 'opacity-75 ring-2 ring-[#00a884]' : ''}
                  `}>
                    
                    {(!isMe && !isSameSenderAsPrev) && (
                      <div className="text-[12.5px] font-semibold text-[#53bdeb] mb-1">
                        {msg.senderName}
                      </div>
                    )}

                    {!isSelectionMode && (
                      <div 
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : msg.id); }}
                        className={`absolute top-1 right-1 cursor-pointer p-1 rounded-bl-lg rounded-tr-lg z-20 transition-opacity
                          ${isMe ? 'bg-gradient-to-l from-[#005c4b] via-[#005c4b]' : 'bg-gradient-to-l from-[#202c33] via-[#202c33]'}
                          md:opacity-0 md:group-hover:opacity-100 ${isMenuOpen ? 'opacity-100' : ''} to-transparent
                        `}
                      >
                        <ChevronDown size={22} className="text-[#8696a0]" />
                      </div>
                    )}

                    {isMenuOpen && (
                      <div onClick={(e) => e.stopPropagation()} className={`absolute top-8 ${isMe ? 'right-0' : 'left-5'} bg-[#233138] border border-[#2a3942] shadow-2xl rounded py-2 w-44 z-[100]`}>
                        <button onClick={() => startSelectionMode(msg.id)} className="w-full text-left px-5 py-2.5 text-[14.5px] text-[#d1d7db] hover:bg-[#182229] transition-colors flex items-center gap-3">
                          <Share2 size={18} /> Teruskan pesan
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
                    
                    {msg.isImage && (
                      <div className="relative mt-0.5 mx-0.5 cursor-pointer" onClick={() => !isSelectionMode && setPreviewMedia(msg)}>
                        <img src={msg.fileData} alt="attachment" className="max-w-full md:max-w-[320px] rounded mb-1 object-cover hover:opacity-95 transition" />
                      </div>
                    )}

                    {!msg.isImage && msg.fileData && (
                      <div className="flex items-center gap-3 bg-[#1e2a30] p-3 rounded mb-1 mt-1 border border-[#2a3942] cursor-pointer hover:bg-[#233138] transition" onClick={() => !isSelectionMode && setPreviewMedia(msg)}>
                        <div className="p-2 bg-[#ff8f6e] rounded text-white shrink-0"><FileText size={20} /></div>
                        <div className="flex-1 min-w-0"><p className="font-medium truncate text-sm text-[#e9edef]">{msg.fileName}</p></div>
                      </div>
                    )}
                    
                    {msg.text && (
                      <div dangerouslySetInnerHTML={formatText(msg.text)} className={`mt-0.5 px-1 ${msg.text.length < 10 && !msg.isImage ? 'pr-12' : 'pr-3'} text-[14.2px]`} />
                    )}
                    
                    <div className={`flex items-center justify-end gap-1 ${msg.text && msg.text.length < 10 && !msg.isImage && !msg.fileData ? 'absolute bottom-1 right-2' : 'mt-1 mr-1 float-right'}`}>
                      {msg.isEdited && <span className="text-[11px] text-[#8696a0] italic mr-1 text-opacity-80">diedit</span>}
                      <span className="text-[11px] text-[#8696a0] text-opacity-90">
                        {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                      </span>
                      {isMe && <CheckCheck size={16} className="text-[#53bdeb]" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {isSelectionMode ? (
          <div className="bg-[#202c33] px-4 py-3 flex justify-between items-center z-10 shadow-lg border-t border-[#222d34]">
            <button onClick={() => { setIsSelectionMode(false); setSelectedMessages([]); }} className="text-[#00a884] font-medium p-2 hover:bg-[#2a3942] rounded-lg transition">
              Batal
            </button>
            <button 
              onClick={executeMultiForward} 
              disabled={selectedMessages.length === 0}
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition ${selectedMessages.length > 0 ? 'bg-[#00a884] text-[#111b21] hover:bg-[#008f6f]' : 'bg-[#2a3942] text-[#8696a0] cursor-not-allowed'}`}
            >
              <Share2 size={18} /> Teruskan ke WA
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="bg-[#202c33] px-4 py-2.5 flex items-end gap-3 shrink-0 z-10 border-t border-[#222d34]">
            <div className="flex gap-1 shrink-0 mb-1">
              <button type="button" onClick={() => alert("Gunakan emoji bawaan HP/PC Anda")} className="text-[#8696a0] hover:text-[#e9edef] p-2 transition-colors rounded-full"><Smile size={26} /></button>
              <input type="file" ref={fileInputRef} onChange={(e) => { if(e.target.files[0]) handleFileProcessing(e.target.files[0]); e.target.value=''; }} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading || editingMessage} className={`text-[#8696a0] hover:text-[#e9edef] p-2 transition-colors rounded-full ${(isUploading || editingMessage) ? 'opacity-50' : ''}`}>
                {isUploading ? <div className="w-6 h-6 border-2 border-[#8696a0] border-t-transparent rounded-full animate-spin"></div> : <Paperclip size={24} className="transform -rotate-45" />}
              </button>
            </div>
            <div className="flex-1 bg-[#2a3942] rounded-lg mb-1 flex items-center pl-4 pr-1">
              <textarea ref={textareaRef} value={newMessage} onChange={handleInputResize} onKeyDown={handleKeyDown} rows={1} placeholder={editingMessage ? "Edit pesan Anda" : "Ketik pesan"} className="flex-1 py-2.5 bg-transparent border-none outline-none resize-none overflow-y-auto text-[#e9edef] placeholder-[#8696a0] text-[15px]" />
            </div>
            <button type="submit" disabled={!newMessage.trim()} className="text-[#8696a0] hover:text-[#00a884] p-3 shrink-0 mb-0.5 rounded-full transition-colors"><Send size={24} className={newMessage.trim() ? "text-[#00a884]" : ""} /></button>
          </form>
        )}
      </div>
    </div>
  );
}