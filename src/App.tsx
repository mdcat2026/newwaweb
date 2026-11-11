// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, setDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Send, LogOut, Paperclip, Search, CheckCheck, FileText, ArrowLeft, Download, ChevronDown, Trash2, Edit2, Share2, X, Users, User, CheckSquare, Square, MessageSquare, Edit3, Camera, Plus, MoreVertical, Eye, Smartphone, Star, Copy, Bell, BellOff, Volume2, VolumeX, Pin, UserPlus, UserMinus, Mail, Link2, ShieldAlert, Loader2 } from 'lucide-react';

// ==========================================
// 1. TEMPEL FIREBASE CONFIG ANDA DI SINI
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

// Opsional: Jika Anda mengunggah file gambar logo MD Chat ke Cloudinary atau folder public,
// Anda bisa menempelkan URL-nya di dalam tanda kutip di bawah ini. Jika dikosongkan, sistem,
// otomatis memakai replika SVG Neon MD Chat berkualitas tinggi di bawahnya.
const CUSTOM_LOGO_IMAGE_URL = 'https://res.cloudinary.com/m8cnadmw/image/upload/v1794388145/khqdyezi9qhiiedndlg7.jpg';

// REPLIKA SVG NEON CYBERPUNK "MD CHAT" (SESUAI GAMBAR LOGO ANDA)
const MD_CHAT_LOGO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <linearGradient id="neonCyanPurple" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f2fe"/>
      <stop offset="50%" stop-color="#4facfe"/>
      <stop offset="100%" stop-color="#c471ed"/>
    </linearGradient>
    <linearGradient id="neonPinkBlue" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d946ef"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="240" height="240" rx="52" fill="#070b14"/>
  <circle cx="120" cy="112" r="78" fill="#0f172a" stroke="url(#neonCyanPurple)" stroke-width="3.5" opacity="0.9"/>
  <circle cx="120" cy="112" r="66" fill="none" stroke="url(#neonPinkBlue)" stroke-width="1.5" stroke-dasharray="18 8 6 8" opacity="0.65"/>
  <!-- Huruf M Neon -->
  <path d="M52 146 V76 L84 116 L116 76 V146" fill="none" stroke="url(#neonCyanPurple)" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
  <!-- Huruf D berbentuk Balon Chat + Ekor Kanan Bawah -->
  <path d="M122 76 H150 C174 76 190 92 190 111 C190 126 180 138 166 143 L178 164 L152 146 H122 Z" fill="#0f172a" stroke="url(#neonPinkBlue)" stroke-width="12" stroke-linejoin="round" filter="url(#glow)"/>
  <!-- 3 Titik Chat di dalam D -->
  <circle cx="142" cy="111" r="4.5" fill="#38bdf8"/>
  <circle cx="155" cy="111" r="4.5" fill="#818cf8"/>
  <circle cx="168" cy="111" r="4.5" fill="#e879f9"/>
  <!-- Teks MD CHAT -->
  <text x="82" y="216" font-family="Arial, sans-serif" font-weight="900" font-size="27" fill="url(#neonCyanPurple)" letter-spacing="1.5">MD</text>
  <text x="132" y="216" font-family="Arial, sans-serif" font-weight="900" font-size="27" fill="#ffffff" letter-spacing="1.5">CHAT</text>
</svg>
`)}`;

const APP_LOGO = CUSTOM_LOGO_IMAGE_URL || MD_CHAT_LOGO_SVG;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  
  const [chatRooms, setChatRooms] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState(null);
  const [chatSearch, setChatSearch] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false); 
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showRoomOptions, setShowRoomOptions] = useState(null); 
  
  const [modalConfig, setModalConfig] = useState({ type: null }); 
  const [newGroupName, setNewGroupName] = useState('');
  const [forwardTargets, setForwardTargets] = useState([]); 
  const [inviteEmail, setInviteEmail] = useState('');
  
  const [previewMedia, setPreviewMedia] = useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
  const [uploadCaption, setUploadCaption] = useState('');
  
  const [currentPinIndex, setCurrentPinIndex] = useState(0);

  const [deleteModalTargets, setDeleteModalTargets] = useState(null);
  const [sysToast, setSysToast] = useState(null);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const [notifSettings, setNotifSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_notif_settings');
      return saved ? JSON.parse(saved) : {
        enabled: true,
        targetDevice: 'both',
        soundEnabled: true,
        volume: 80,
        vibrateEnabled: true
      };
    } catch (e) {
      return { enabled: true, targetDevice: 'both', soundEnabled: true, volume: 80, vibrateEnabled: true };
    }
  });

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const groupPhotoInputRef = useRef(null);
  const textareaRef = useRef(null);
  
  const longPressTimerRef = useRef(null);
  const lastBackPressRef = useRef(0);
  const lastNotifiedRef = useRef({});
  const isInitialLoadRef = useRef(true);
  const navStateRef = useRef({});
  const swRegistrationRef = useRef(null);
  const audioCtxRef = useRef(null);
  const notifSettingsRef = useRef(notifSettings);
  const uploadingLockRef = useRef(false);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // OTOMATIS PASANG FAVICON, TITLE & LOGO "MD CHAT" DI BROWSER DAN HOME SCREEN HP
  useEffect(() => {
    try {
      document.title = 'MD Chat';
      const existingIcons = document.querySelectorAll("link[rel*='icon'], link[rel='apple-touch-icon']");
      existingIcons.forEach(el => el.parentNode?.removeChild(el));

      const link = document.createElement('link');
      link.type = CUSTOM_LOGO_IMAGE_URL ? 'image/png' : 'image/svg+xml';
      link.rel = 'icon';
      link.href = APP_LOGO;
      document.head.appendChild(link);

      const appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      appleLink.href = APP_LOGO;
      document.head.appendChild(appleLink);
    } catch (e) {}
  }, []);

  useEffect(() => {
    notifSettingsRef.current = notifSettings;
    try {
      localStorage.setItem('nexus_notif_settings', JSON.stringify(notifSettings));
    } catch (e) {}
  }, [notifSettings]);

  const showToast = (msg) => {
    setSysToast(msg);
    setTimeout(() => setSysToast(null), 2600);
  };

  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext && !audioCtxRef.current) {
          audioCtxRef.current = new AudioContext();
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      } catch (e) {}
    };
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
  }, []);

  const playNotificationSound = (customVol = null) => {
    const cfg = notifSettingsRef.current;
    if (!cfg.soundEnabled && customVol === null) return;
    const vol = (customVol !== null ? customVol : cfg.volume) / 100;
    if (vol <= 0) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current && AudioContext) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        osc1.frequency.setValueAtTime(880, now + 0.12);
        gain1.gain.setValueAtTime(vol * 0.6, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.45);
        return;
      }
    } catch (e) {}

    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
      audio.volume = Math.min(1, Math.max(0, vol));
      audio.play().catch(() => {});
    } catch (e) {}
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        swRegistrationRef.current = reg;
      }).catch(() => {
        try {
          const swCode = `
            self.addEventListener('install', (e) => self.skipWaiting());
            self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
            self.addEventListener('notificationclick', (e) => { e.notification.close(); });
          `;
          const blob = new Blob([swCode], { type: 'application/javascript' });
          navigator.serviceWorker.register(URL.createObjectURL(blob)).then((reg) => {
            swRegistrationRef.current = reg;
          }).catch(() => {});
        } catch (e) {}
      });
    }
  }, []);

  useEffect(() => {
    navStateRef.current = {
      previewMedia,
      pendingUploadFile,
      deleteModalTargets,
      modalType: modalConfig.type,
      isSelectionMode,
      showGroupInfo,
      showChatSearch,
      isMobileChatOpen
    };
  }, [previewMedia, pendingUploadFile, deleteModalTargets, modalConfig.type, isSelectionMode, showGroupInfo, showChatSearch, isMobileChatOpen]);

  useEffect(() => {
    window.history.pushState({ page: 'md_chat_root' }, '');

    const handlePopState = () => {
      const s = navStateRef.current;

      if (s.previewMedia) {
        setPreviewMedia(null);
        window.history.pushState({ page: 'md_chat_root' }, '');
      } else if (s.pendingUploadFile) {
        if (!uploadingLockRef.current) {
          setPendingUploadFile(null);
          setPendingPreviewUrl(null);
        }
        window.history.pushState({ page: 'md_chat_root' }, '');
      } else if (s.deleteModalTargets) {
        setDeleteModalTargets(null);
        window.history.pushState({ page: 'md_chat_root' }, '');
      } else if (s.modalType) {
        setModalConfig({ type: null });
        setForwardTargets([]);
        window.history.pushState({ page: 'md_chat_root' }, '');
      } else if (s.isSelectionMode) {
        setIsSelectionMode(false);
        setSelectedMessages([]);
        window.history.pushState({ page: 'md_chat_root' }, '');
      } else if (s.showGroupInfo) {
        setShowGroupInfo(false);
        window.history.pushState({ page: 'md_chat_root' }, '');
      } else if (s.showChatSearch) {
        setShowChatSearch(false);
        setChatSearch('');
        window.history.pushState({ page: 'md_chat_root' }, '');
      } else if (s.isMobileChatOpen) {
        setIsMobileChatOpen(false);
        window.history.pushState({ page: 'md_chat_root' }, '');
      } else {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          window.history.back();
        } else {
          lastBackPressRef.current = now;
          showToast("Tekan kembali sekali lagi untuk keluar aplikasi");
          window.history.pushState({ page: 'md_chat_root' }, '');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert("Browser di perangkat ini tidak mendukung notifikasi sistem.");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      showToast("Izin Notifikasi Sistem Aktif!");
      triggerExternalNotification("MD Chat", "Notifikasi Pop-up & Suara berhasil diaktifkan!", APP_LOGO, true);
    } else {
      showToast("Izin notifikasi ditolak di pengaturan browser.");
    }
  };

  const triggerExternalNotification = async (roomName, messageText, avatarUrl, isTest = false) => {
    const cfg = notifSettingsRef.current;
    if (!cfg.enabled && !isTest) return;

    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    if (!isTest) {
      if (cfg.targetDevice === 'mobile' && !isMobileDevice) return;
      if (cfg.targetDevice === 'desktop' && isMobileDevice) return;
    }

    if (cfg.soundEnabled || isTest) {
      playNotificationSound();
    }
    if ((cfg.vibrateEnabled || isTest) && navigator.vibrate) {
      try { navigator.vibrate([300, 100, 300, 100, 400]); } catch (e) {}
    }

    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const options = {
      body: messageText || 'Mengirim lampiran file...',
      icon: avatarUrl || APP_LOGO,
      badge: APP_LOGO,
      tag: `mdchat-msg-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      silent: false,
      timestamp: Date.now(),
      vibrate: cfg.vibrateEnabled ? [300, 100, 300, 100, 400] : [200]
    };

    try {
      if ('serviceWorker' in navigator) {
        const reg = swRegistrationRef.current || await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          await reg.showNotification(roomName, options);
          return;
        }
      }
      const notif = new Notification(roomName, options);
      notif.onclick = () => { window.focus(); notif.close(); };
    } catch (err) {
      try {
        const notif = new Notification(roomName, options);
        notif.onclick = () => { window.focus(); notif.close(); };
      } catch (e) {}
    }
  };

  const togglePinRoom = async (room) => {
    const isPinned = room.pinnedBy?.includes(user.uid);
    try {
      await updateDoc(doc(db, 'chatRooms', room.id), {
        pinnedBy: isPinned ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
      showToast(isPinned ? "Sematan obrolan dilepas" : "Obrolan disematkan ke atas");
    } catch (e) {}
    setShowRoomOptions(null);
  };

  const toggleMuteRoom = async (room) => {
    const isMuted = room.mutedBy?.includes(user.uid);
    try {
      await updateDoc(doc(db, 'chatRooms', room.id), {
        mutedBy: isMuted ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
      showToast(isMuted ? `Notifikasi ${room.displayName} diaktifkan` : `Notifikasi ${room.displayName} dibisukan`);
    } catch (e) {}
    setShowRoomOptions(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinRoomId = params.get('join');
    if (joinRoomId) {
      localStorage.setItem('mdchat_pending_join', joinRoomId);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await setDoc(doc(db, 'users', currentUser.uid), {
          uid: currentUser.uid, email: currentUser.email, name: currentUser.displayName, photo: currentUser.photoURL, lastSeen: serverTimestamp()
        }, { merge: true });

        const pendingJoinId = localStorage.getItem('mdchat_pending_join');
        if (pendingJoinId) {
          try {
            await updateDoc(doc(db, 'chatRooms', pendingJoinId), {
              participants: arrayUnion(currentUser.uid),
              removedParticipants: arrayRemove(currentUser.uid)
            });
            localStorage.removeItem('mdchat_pending_join');
            window.history.replaceState({}, document.title, window.location.pathname);
            showToast("Anda berhasil bergabung ke grup melalui tautan undangan!");
          } catch (e) {
            localStorage.removeItem('mdchat_pending_join');
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const qUsers = query(collection(db, 'users'));
    const unsub = onSnapshot(qUsers, (snapshot) => {
      const allDocs = snapshot.docs.map(d => d.data());
      const myDoc = allDocs.find(u => u.uid === user.uid);
      if (myDoc?.isBlocked && user.email !== ADMIN_EMAIL) {
        alert("Akses akun Anda telah dinonaktifkan oleh Administrator.");
        signOut(auth);
        return;
      }
      setContacts(allDocs.filter(u => u.uid !== user.uid && !u.isBlocked));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const qRooms = query(collection(db, 'chatRooms'), orderBy('lastMessageTime', 'desc'));
    const unsub = onSnapshot(qRooms, (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const processedRooms = [];
      let totalUnreadGlobal = 0;
      
      rooms.forEach(room => {
        const isKicked = room.removedParticipants?.includes(user.uid);
        if (isKicked && !isAdmin) return;

        const isParticipant = room.type === 'group' || (room.type === 'private' && room.participants?.includes(user.uid));
        const hasMessages = !!room.lastMessage;
        const isCreator = room.createdBy === user.uid;
        
        if (isParticipant && (hasMessages || isCreator)) {
           if (room.type === 'private') {
              const otherUid = room.participants.find(uid => uid !== user.uid);
              const otherName = room.participantNames?.[room.participants.indexOf(otherUid)];
              const otherPhoto = contacts.find(c => c.uid === otherUid)?.photo || 'https://api.dicebear.com/7.x/initials/svg?seed=user';
              room.displayAvatar = otherPhoto;
              room.displayName = otherName || 'Pengguna';
           } else {
              room.displayAvatar = room.avatar;
              room.displayName = room.name;
           }
           
           room.isPinnedRoom = room.pinnedBy?.includes(user.uid) || false;
           room.isMutedRoom = room.mutedBy?.includes(user.uid) || false;

           const isMobile = window.innerWidth <= 768;
           const isRoomActivelyViewed = activeGroup?.id === room.id && (!isMobile || isMobileChatOpen) && document.visibilityState === 'visible';
           room.badgeCount = isRoomActivelyViewed ? 0 : (room.unreadCount?.[user.uid] || 0);
           totalUnreadGlobal += room.badgeCount;

           const senderPrefix = (room.type === 'group' && room.lastSenderName)
             ? `${room.lastSenderId === user.uid ? 'Anda' : room.lastSenderName.split(' ')[0]}: `
             : '';
           room.formattedPreview = room.lastMessage ? `${senderPrefix}${room.lastMessage}` : 'Belum ada pesan';

           const msgTimeStr = room.lastMessageTime?.toMillis()?.toString();
           if (!isInitialLoadRef.current && msgTimeStr && lastNotifiedRef.current[room.id] !== msgTimeStr) {
              if (room.lastSenderId && room.lastSenderId !== user.uid && room.lastMessage && !room.isMutedRoom) {
                 if (document.visibilityState !== 'visible' || !document.hasFocus() || !isRoomActivelyViewed) {
                    const notifBody = room.type === 'group' && room.lastSenderName
                      ? `${room.lastSenderName}: ${room.lastMessage}`
                      : room.lastMessage;
                    triggerExternalNotification(room.displayName, notifBody, room.displayAvatar);
                 }
              }
           }
           if (msgTimeStr) {
              lastNotifiedRef.current[room.id] = msgTimeStr;
           }

           processedRooms.push(room);
        }
      });
      
      processedRooms.sort((a, b) => {
        if (a.isPinnedRoom && !b.isPinnedRoom) return -1;
        if (!a.isPinnedRoom && b.isPinnedRoom) return 1;
        const timeA = a.lastMessageTime?.toMillis?.() || 0;
        const timeB = b.lastMessageTime?.toMillis?.() || 0;
        return timeB - timeA;
      });

      isInitialLoadRef.current = false;
      setChatRooms(processedRooms);

      if (activeGroup) {
        const updatedActive = processedRooms.find(r => r.id === activeGroup.id);
        if (updatedActive) setActiveGroup(updatedActive);
      }

      if ('setAppBadge' in navigator) {
         if (totalUnreadGlobal > 0) navigator.setAppBadge(totalUnreadGlobal).catch(() => {});
         else navigator.clearAppBadge().catch(() => {});
      }
      document.title = totalUnreadGlobal > 0 ? `(${totalUnreadGlobal}) MD Chat` : 'MD Chat';
    });
    return () => unsub();
  }, [user, contacts, activeGroup?.id, isMobileChatOpen]);

  useEffect(() => {
    if (!user || !activeGroup) return;
    setCurrentPinIndex(0);

    if (activeGroup.id) {
       updateDoc(doc(db, 'chatRooms', activeGroup.id), { [`unreadCount.${user.uid}`]: 0 }).catch(() => {});
    }

    const q = query(collection(db, `messages_${activeGroup.id}`), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      
      if (document.visibilityState === 'visible') {
         updateDoc(doc(db, 'chatRooms', activeGroup.id), { [`unreadCount.${user.uid}`]: 0 }).catch(() => {});
      }
    });
    
    setIsSelectionMode(false); setSelectedMessages([]); setShowGroupInfo(false); setChatSearch(''); setShowChatSearch(false);
    return () => unsub();
  }, [activeGroup?.id, user]);

  useEffect(() => {
    const handlePaste = (e) => {
      if (!user || !activeGroup || modalConfig.type) return; 
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) { setPendingUploadFile(file); setPendingPreviewUrl(URL.createObjectURL(file)); setUploadCaption(''); }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [user, activeGroup, modalConfig]);

  const handleTouchStartMsg = (msgId) => {
    if (isSelectionMode) return;
    longPressTimerRef.current = setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedMessages([msgId]);
      setOpenMenuId(null);
      if (navigator.vibrate) navigator.vibrate(45);
    }, 500);
  };

  const handleTouchEndOrMoveMsg = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCopyMessages = (msgArray) => {
    const textToCopy = msgArray.map(m => m.text || m.fileData || '').filter(Boolean).join('\n\n');
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      showToast(`${msgArray.length} pesan disalin ke clipboard`);
    }
    setIsSelectionMode(false);
    setSelectedMessages([]);
    setOpenMenuId(null);
  };

  const syncSidebarLastMessage = async (roomId, remainingMessages) => {
    if (!roomId) return;
    if (!remainingMessages || remainingMessages.length === 0) {
      await updateDoc(doc(db, 'chatRooms', roomId), {
        lastMessage: '',
        lastSenderName: ''
      }).catch(() => {});
    } else {
      const lastMsg = remainingMessages[remainingMessages.length - 1];
      const previewText = lastMsg.text
        ? (lastMsg.text.substring(0, 35) + (lastMsg.text.length > 35 ? '...' : ''))
        : (lastMsg.fileName ? `📎 ${lastMsg.fileName}` : 'Pesan');
      await updateDoc(doc(db, 'chatRooms', roomId), {
        lastMessage: previewText,
        lastSenderId: lastMsg.uid,
        lastSenderName: lastMsg.senderName || ''
      }).catch(() => {});
    }
  };

  const openDeleteConfirmation = (msgId = null) => {
    const targetIds = msgId ? [msgId] : selectedMessages;
    if (targetIds.length === 0) return;
    const targetObjs = messages.filter(m => targetIds.includes(m.id));
    setDeleteModalTargets(targetObjs);
    setOpenMenuId(null);
  };

  const executeDeleteForMe = async () => {
    if (!deleteModalTargets || !activeGroup) return;
    const deletedIds = deleteModalTargets.map(m => m.id);
    try {
      for (const msg of deleteModalTargets) {
        await updateDoc(doc(db, `messages_${activeGroup.id}`, msg.id), {
          deletedFor: arrayUnion(user.uid)
        });
      }
      const remaining = messages.filter(m => !m.deletedFor?.includes(user.uid) && !deletedIds.includes(m.id));
      await syncSidebarLastMessage(activeGroup.id, remaining);
      showToast("Pesan dihapus untuk Anda");
    } catch (err) {
      alert("Gagal menghapus pesan.");
    }
    setDeleteModalTargets(null);
    setIsSelectionMode(false);
    setSelectedMessages([]);
  };

  const executeDeleteForEveryone = async () => {
    if (!deleteModalTargets || !activeGroup) return;
    const deletedIds = deleteModalTargets.map(m => m.id);
    try {
      for (const msg of deleteModalTargets) {
        await deleteDoc(doc(db, `messages_${activeGroup.id}`, msg.id));
      }
      const remaining = messages.filter(m => !deletedIds.includes(m.id) && !m.deletedFor?.includes(user.uid));
      await syncSidebarLastMessage(activeGroup.id, remaining);
      showToast("Pesan dihapus untuk semua orang");
    } catch (err) {
      alert("Gagal menghapus pesan.");
    }
    setDeleteModalTargets(null);
    setIsSelectionMode(false);
    setSelectedMessages([]);
  };

  const handleAddMemberToGroup = async (targetUser) => {
    if (!activeGroup) return;
    try {
      await updateDoc(doc(db, 'chatRooms', activeGroup.id), {
        participants: arrayUnion(targetUser.uid),
        removedParticipants: arrayRemove(targetUser.uid)
      });
      showToast(`${targetUser.name} ditambahkan ke grup`);
    } catch (e) {
      alert("Gagal menambahkan anggota.");
    }
  };

  const handleRemoveMemberFromGroup = async (targetUser) => {
    if (!activeGroup) return;
    if (!window.confirm(`Keluarkan ${targetUser.name} dari grup ${activeGroup.displayName}?`)) return;
    try {
      await updateDoc(doc(db, 'chatRooms', activeGroup.id), {
        participants: arrayRemove(targetUser.uid),
        removedParticipants: arrayUnion(targetUser.uid)
      });
      showToast(`${targetUser.name} dikeluarkan dari grup`);
    } catch (e) {
      alert("Gagal mengeluarkan anggota.");
    }
  };

  const handleSendEmailInvite = (e) => {
    e?.preventDefault();
    if (!inviteEmail.trim() || !activeGroup) return;
    const targetEmail = inviteEmail.trim().toLowerCase();
    const joinLink = `${window.location.origin}/?join=${activeGroup.id}`;

    const existingContact = contacts.find(c => c.email?.toLowerCase() === targetEmail);
    if (existingContact) {
      handleAddMemberToGroup(existingContact);
    }

    const subject = encodeURIComponent(`Undangan Bergabung ke Grup "${activeGroup.displayName}" - MD Chat`);
    const body = encodeURIComponent(
      `Halo,\n\n${user.displayName} mengundang Anda untuk bergabung ke ruang percakapan grup "${activeGroup.displayName}" di aplikasi MD Chat.\n\nKlik tautan di bawah ini untuk langsung bergabung:\n${joinLink}\n\nSalam,\nTim MD Chat`
    );
    window.open(`mailto:${targetEmail}?subject=${subject}&body=${body}`, '_blank');
    setInviteEmail('');
    showToast("Membuka pengirim email undangan...");
  };

  const handleCopyGroupInviteLink = () => {
    if (!activeGroup) return;
    const joinLink = `${window.location.origin}/?join=${activeGroup.id}`;
    navigator.clipboard.writeText(joinLink);
    showToast("Tautan undangan grup disalin!");
  };

  const handleAdminDeleteUserAccount = async (targetUser) => {
    if (!isAdmin) return;
    if (!window.confirm(`PERINGATAN ADMIN:\nKeluarkan dan blokir akun "${targetUser.name}" (${targetUser.email}) dari seluruh sistem MD Chat?`)) return;
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), { isBlocked: true });
      for (const room of chatRooms) {
        if (room.participants?.includes(targetUser.uid)) {
          await updateDoc(doc(db, 'chatRooms', room.id), {
            participants: arrayRemove(targetUser.uid),
            removedParticipants: arrayUnion(targetUser.uid)
          }).catch(() => {});
        }
      }
      showToast(`Akun ${targetUser.name} berhasil dihapus & diblokir.`);
    } catch (e) {
      alert("Gagal menghapus akun.");
    }
  };

  const handleLogin = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (error) { console.error("Error login:", error); }
  };

  const submitNewGroup = async () => {
    if (!newGroupName.trim()) return;
    const allMemberUids = [user.uid, ...contacts.map(c => c.uid)];
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newGroupName)}&backgroundColor=0f172a`;
    const newRoom = await addDoc(collection(db, 'chatRooms'), {
      name: newGroupName, type: 'group', avatar: avatarUrl,
      createdAt: serverTimestamp(), lastMessageTime: serverTimestamp(), createdBy: user.uid, participants: allMemberUids, removedParticipants: [], unreadCount: {}, pinnedBy: [], mutedBy: []
    });
    setActiveGroup({ id: newRoom.id, name: newGroupName, displayName: newGroupName, avatar: avatarUrl, displayAvatar: avatarUrl, type: 'group', participants: allMemberUids });
    setModalConfig({ type: null }); setNewGroupName(''); setIsMobileChatOpen(true);
  };

  const submitNewJapri = async (targetUser) => {
    const existingRoom = chatRooms.find(r => r.type === 'private' && r.participants.includes(user.uid) && r.participants.includes(targetUser.uid));
    if (existingRoom) { 
       setActiveGroup(existingRoom); 
    } else {
      const newRoom = await addDoc(collection(db, 'chatRooms'), {
        name: `Private`, type: 'private',
        createdAt: serverTimestamp(), lastMessageTime: serverTimestamp(), createdBy: user.uid, 
        participants: [user.uid, targetUser.uid], 
        participantNames: [user.displayName, targetUser.name],
        unreadCount: {}, pinnedBy: [], mutedBy: []
      });
      setActiveGroup({ id: newRoom.id, name: 'Private', displayName: targetUser.name, avatar: targetUser.photo, displayAvatar: targetUser.photo, type: 'private', participants: [user.uid, targetUser.uid] });
    }
    setModalConfig({ type: null }); setIsMobileChatOpen(true);
  };

  const handleDeleteRoom = async (roomId) => {
    if (window.confirm("Hapus seluruh ruangan obrolan ini permanen?")) {
      await deleteDoc(doc(db, 'chatRooms', roomId));
      if (activeGroup?.id === roomId) { setActiveGroup(null); setIsMobileChatOpen(false); }
      setShowRoomOptions(null);
    }
  };

  const handleClearAllMessages = async () => {
    if (window.confirm("Bersihkan isi percakapan? (Pesan akan terhapus secara permanen)")) {
      for (const m of messages) {
        await deleteDoc(doc(db, `messages_${activeGroup.id}`, m.id));
      }
      await updateDoc(doc(db, 'chatRooms', activeGroup.id), {
        lastMessage: '',
        lastSenderName: ''
      }).catch(() => {});
      setShowRoomOptions(null);
      showToast("Isi percakapan dibersihkan");
    }
  };

  const togglePinMessage = async (msg) => {
    await updateDoc(doc(db, `messages_${activeGroup.id}`, msg.id), { isPinned: !msg.isPinned, pinnedAt: serverTimestamp() });
    setOpenMenuId(null);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeGroup) return;
    
    let msgText = newMessage;
    setNewMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    if (editingMessage) {
      const editId = editingMessage.id;
      setEditingMessage(null);
      await updateDoc(doc(db, `messages_${activeGroup.id}`, editId), { text: msgText, isEdited: true });
      const visible = messages.filter(m => !m.deletedFor?.includes(user.uid));
      if (visible.length > 0 && visible[visible.length - 1].id === editId) {
        await updateDoc(doc(db, 'chatRooms', activeGroup.id), {
          lastMessage: msgText.substring(0, 35) + (msgText.length > 35 ? '...' : '')
        }).catch(() => {});
      }
    } else {
      await addDoc(collection(db, `messages_${activeGroup.id}`), {
        text: msgText, uid: user.uid, senderName: user.displayName, senderAvatar: user.photoURL, timestamp: serverTimestamp(), isEdited: false, isPinned: false, deletedFor: []
      });
      
      const updateData = {
        lastMessage: msgText.substring(0, 35) + (msgText.length > 35 ? '...' : ''),
        lastSenderId: user.uid,
        lastSenderName: user.displayName,
        lastMessageTime: serverTimestamp()
      };
      const targetUids = activeGroup.type === 'group'
        ? (activeGroup.participants?.length ? activeGroup.participants : contacts.map(c => c.uid))
        : (activeGroup.participants || []);
      targetUids.forEach(pUid => {
         if (pUid !== user.uid && !activeGroup.removedParticipants?.includes(pUid)) {
           updateData[`unreadCount.${pUid}`] = increment(1);
         }
      });
      await updateDoc(doc(db, 'chatRooms', activeGroup.id), updateData);
    }
  };

  const handleFileSelection = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingUploadFile(file); setUploadCaption('');
    setPendingPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    e.target.value = ''; 
  };

  const confirmUpload = async () => {
    if (!pendingUploadFile || !activeGroup || uploadingLockRef.current || isUploading) return;
    uploadingLockRef.current = true;
    setIsUploading(true);

    const fileToSend = pendingUploadFile;
    const captionToSend = uploadCaption;
    const isImage = fileToSend.type.startsWith('image/');
    const formData = new FormData();
    formData.append('file', fileToSend);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isImage ? 'image' : 'raw'}/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.secure_url) {
        await addDoc(collection(db, `messages_${activeGroup.id}`), {
          text: captionToSend || '', fileData: data.secure_url, fileName: fileToSend.name || 'Lampiran', isImage: isImage, uid: user.uid, senderName: user.displayName, senderAvatar: user.photoURL, timestamp: serverTimestamp(), isPinned: false, deletedFor: []
        });
        
        const previewLabel = captionToSend ? captionToSend.substring(0, 35) : `📎 ${fileToSend.name}`;
        const updateData = {
          lastMessage: previewLabel,
          lastSenderId: user.uid,
          lastSenderName: user.displayName,
          lastMessageTime: serverTimestamp()
        };
        const targetUids = activeGroup.type === 'group'
          ? (activeGroup.participants?.length ? activeGroup.participants : contacts.map(c => c.uid))
          : (activeGroup.participants || []);
        targetUids.forEach(pUid => {
          if (pUid !== user.uid && !activeGroup.removedParticipants?.includes(pUid)) {
            updateData[`unreadCount.${pUid}`] = increment(1);
          }
        });
        await updateDoc(doc(db, 'chatRooms', activeGroup.id), updateData);
        
        setPendingUploadFile(null); setPendingPreviewUrl(null); setUploadCaption('');
        showToast("File berhasil dikirim!");
      } else { throw new Error(data.error?.message); }
    } catch (error) {
      alert(`GAGAL UPLOAD!\nPastikan koneksi stabil serta nama Cloudinary dan Preset sudah benar.`);
    } finally {
      uploadingLockRef.current = false;
      setIsUploading(false);
    }
  };

  const handleForwardToWA = async (msgArray) => {
    if (msgArray.length === 1 && msgArray[0].fileData && navigator.canShare) {
      try {
        const msg = msgArray[0];
        const response = await fetch(msg.fileData);
        const blob = await response.blob();
        const file = new File([blob], msg.fileName || 'Lampiran', { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: msg.fileName, text: msg.text || '', files: [file] });
          setIsSelectionMode(false); setSelectedMessages([]); setOpenMenuId(null); setModalConfig({type: null});
          return; 
        }
      } catch (error) { console.log("Fallback Share Link"); }
    }
    let finalWaText = msgArray.map((m) => {
      let textSegment = m.text || '';
      let header = `Pesan dari *${m.senderName}*:`;
      if (m.fileName) return `${header}\n📁 [File]: ${m.fileData}\n${textSegment}`;
      return `${header}\n${textSegment}`;
    }).join('\n\n━━━━━━━━━━━━━━━\n\n'); 
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(finalWaText)}`, '_blank');
    setIsSelectionMode(false); setSelectedMessages([]); setOpenMenuId(null); setModalConfig({type: null});
  };

  const toggleForwardTarget = (target) => {
    if (forwardTargets.some(t => t.id === target.id)) { setForwardTargets(forwardTargets.filter(t => t.id !== target.id)); } 
    else { setForwardTargets([...forwardTargets, target]); }
  };

  const executeInternalForward = async () => {
    if (!selectedMessages.length || !forwardTargets.length) return;
    const msgsToForward = messages.filter(m => selectedMessages.includes(m.id));
    
    for (let target of forwardTargets) {
      let roomId = target.id;
      let targetParticipants = [];
      if (target.isContact) {
         const existingRoom = chatRooms.find(r => r.type === 'private' && r.participants.includes(user.uid) && r.participants.includes(target.uid));
         if (existingRoom) {
            roomId = existingRoom.id;
            targetParticipants = existingRoom.participants;
         } else {
            const newRoom = await addDoc(collection(db, 'chatRooms'), {
              name: `Private`, type: 'private',
              createdAt: serverTimestamp(), lastMessageTime: serverTimestamp(), createdBy: user.uid, 
              participants: [user.uid, target.uid], participantNames: [user.displayName, target.name], unreadCount: {}, pinnedBy: [], mutedBy: []
            });
            roomId = newRoom.id;
            targetParticipants = [user.uid, target.uid];
         }
      } else {
         const grp = chatRooms.find(r => r.id === roomId);
         targetParticipants = grp?.type === 'group' ? (grp?.participants?.length ? grp.participants : contacts.map(c => c.uid)) : (grp?.participants || []);
      }

      for (let msg of msgsToForward) {
        await addDoc(collection(db, `messages_${roomId}`), {
          text: msg.text || '', fileData: msg.fileData || null, fileName: msg.fileName || null, isImage: msg.isImage || false,
          uid: user.uid, senderName: user.displayName, senderAvatar: user.photoURL, timestamp: serverTimestamp(), isEdited: false, isForwarded: true, isPinned: false, deletedFor: []
        });
      }
      
      const lastForwarded = msgsToForward[msgsToForward.length - 1];
      const previewLabel = lastForwarded.text ? lastForwarded.text.substring(0, 35) : `📎 ${lastForwarded.fileName || 'Lampiran'}`;
      const updateData = {
        lastMessage: previewLabel,
        lastSenderId: user.uid,
        lastSenderName: user.displayName,
        lastMessageTime: serverTimestamp()
      };
      targetParticipants.forEach(pUid => { if (pUid !== user.uid) updateData[`unreadCount.${pUid}`] = increment(1); });
      await updateDoc(doc(db, 'chatRooms', roomId), updateData);
    }

    if (forwardTargets.length === 1) {
       let target = forwardTargets[0];
       let roomToOpen = chatRooms.find(r => r.id === target.id) || chatRooms.find(r => r.type === 'private' && r.participants.includes(target.uid));
       if (roomToOpen) { setActiveGroup(roomToOpen); setIsMobileChatOpen(true); }
    }
    setModalConfig({type: null}); setIsSelectionMode(false); setSelectedMessages([]); setForwardTargets([]);
    showToast("Pesan berhasil diteruskan");
  };

  const jumpToMessage = (msgId, room = null) => {
    if(room && (!activeGroup || activeGroup.id !== room.id)) {
       setActiveGroup(room); setIsMobileChatOpen(true);
    }
    setShowGroupInfo(false); setGlobalSearchResults(null); setSidebarSearch('');
    setTimeout(() => {
      const el = document.getElementById(`msg-${msgId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-[#3b82f6]/40', 'transition-colors', 'duration-[2000ms]');
        setTimeout(() => el.classList.remove('bg-[#3b82f6]/40'), 3000);
      }
    }, 500);
  };

  const handleGlobalSearch = async (e) => {
    if (e.key === 'Enter') {
      if (!sidebarSearch.trim()) { setGlobalSearchResults(null); return; }
      let results = [];
      for (let room of chatRooms) {
        const q = query(collection(db, `messages_${room.id}`), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (data.deletedFor?.includes(user.uid)) return;
          const term = sidebarSearch.toLowerCase();
          if (data.text?.toLowerCase().includes(term) || data.fileName?.toLowerCase().includes(term)) { results.push({ ...data, id: docSnap.id, room: room }); }
        });
      }
      setGlobalSearchResults(results);
    }
  };

  const formatText = (text) => {
    if (!text) return { __html: '' };
    let formatted = text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*(.*?)\*/g, "<strong>$1</strong>").replace(/_(.*?)_/g, "<em>$1</em>").replace(/\n/g, "<br />");
    return { __html: formatted };
  };
  
  const handleInputResize = (e) => { setNewMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; };
  const handleKeyDown = (e) => { const isMobile = window.innerWidth <= 768; if (e.key === 'Enter' && !e.shiftKey && !isMobile) { e.preventDefault(); handleSendMessage(e); } };
  const startEditing = (msg) => { setEditingMessage(msg); setNewMessage(msg.text); setOpenMenuId(null); setTimeout(() => textareaRef.current?.focus(), 100); };
  const toggleSelection = (msgId) => {
    if (selectedMessages.includes(msgId)) {
      const newSelection = selectedMessages.filter(id => id !== msgId);
      setSelectedMessages(newSelection);
      if (newSelection.length === 0) setIsSelectionMode(false);
    } else { setSelectedMessages([...selectedMessages, msgId]); }
  };
  const handleForceDownload = (url) => {
    let downloadUrl = url;
    if (url.includes('cloudinary.com') && !url.includes('fl_attachment')) { downloadUrl = url.replace('/upload/', '/upload/fl_attachment/'); }
    window.open(downloadUrl, '_blank');
  };
  const handleEditGroupName = async () => {
    if (!isAdmin && activeGroup.createdBy !== user.uid) return alert("Hanya pembuat atau Admin yang bisa mengubah nama.");
    const newName = window.prompt("Ubah nama grup:", activeGroup.displayName);
    if (newName && newName.trim()) { await updateDoc(doc(db, 'chatRooms', activeGroup.id), { name: newName }); setActiveGroup({...activeGroup, name: newName, displayName: newName}); }
  };
  const handleUpdateGroupPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!isAdmin && activeGroup.createdBy !== user.uid) return alert("Hanya Admin/Pembuat yang bisa mengubah foto.");
    const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.secure_url) { await updateDoc(doc(db, 'chatRooms', activeGroup.id), { avatar: data.secure_url }); setActiveGroup({...activeGroup, avatar: data.secure_url, displayAvatar: data.secure_url}); }
    } catch (error) { alert("Gagal mengubah foto profil."); }
  };

  // HALAMAN LOGIN DENGAN LOGO & BRANDING "MD CHAT"
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#070b14]">
        <div className="bg-[#111827] p-10 rounded-3xl shadow-[0_0_50px_rgba(56,189,248,0.15)] text-center max-w-sm w-full mx-4 border border-[#1e293b]">
          <img src={APP_LOGO} alt="MD Chat Logo" className="w-28 h-28 mx-auto mb-5 rounded-3xl shadow-[0_0_30px_rgba(196,113,237,0.3)] object-contain" />
          <h1 className="text-3xl font-black tracking-wider mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f2fe] via-[#4facfe] to-[#c471ed]">MD</span>{' '}
            <span className="text-white">CHAT</span>
          </h1>
          <p className="mb-8 text-[#94a3b8] text-xs tracking-wide">Enterprise Real-Time Communication</p>
          <button onClick={handleLogin} className="w-full bg-gradient-to-r from-[#00f2fe] via-[#3b82f6] to-[#c471ed] text-white py-3.5 rounded-xl transition-all font-bold shadow-lg hover:opacity-95">
            Masuk dengan Google
          </button>
        </div>
      </div>
    );
  }

  const visibleMessages = messages.filter(m => !m.deletedFor?.includes(user.uid));

  const filteredRooms = chatRooms.filter(r => r.displayName.toLowerCase().includes(sidebarSearch.toLowerCase()));
  const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.email.toLowerCase().includes(contactSearch.toLowerCase()));
  const filteredMessages = chatSearch.trim() ? visibleMessages.filter(m => m.text?.toLowerCase().includes(chatSearch.toLowerCase()) || m.fileName?.toLowerCase().includes(chatSearch.toLowerCase())) : visibleMessages;
  
  const pinnedMessages = visibleMessages.filter(m => m.isPinned).sort((a, b) => {
      const timeA = a.pinnedAt?.toMillis() || a.timestamp?.toMillis() || 0;
      const timeB = b.pinnedAt?.toMillis() || b.timestamp?.toMillis() || 0;
      return timeB - timeA; 
  });

  const handlePinClick = () => {
    if (pinnedMessages.length === 0) return;
    const msgToJump = pinnedMessages[currentPinIndex] || pinnedMessages[0];
    jumpToMessage(msgToJump.id);
    setCurrentPinIndex(prev => (prev + 1) % pinnedMessages.length);
  };

  const forwardContactList = contacts.map(c => ({ id: c.uid, uid: c.uid, name: c.name, photo: c.photo, isContact: true }));
  const forwardRoomList = chatRooms.filter(r => r.type === 'group').map(r => ({ id: r.id, name: r.displayName, photo: r.displayAvatar, isContact: false }));
  const allForwardOptions = [...forwardRoomList, ...forwardContactList].filter(opt => opt.name.toLowerCase().includes(contactSearch.toLowerCase()));

  const canDeleteForEveryone = deleteModalTargets && deleteModalTargets.length > 0 && deleteModalTargets.every(m => m.uid === user.uid || isAdmin);

  const activeGroupMemberUids = activeGroup?.type === 'group'
    ? (activeGroup.participants?.length ? activeGroup.participants : [user.uid, ...contacts.map(c => c.uid)]).filter(uid => !activeGroup.removedParticipants?.includes(uid))
    : [];
  const allKnownUsers = [{ uid: user.uid, name: `${user.displayName} (Anda)`, email: user.email, photo: user.photoURL }, ...contacts];
  const groupMemberObjects = allKnownUsers.filter(u => activeGroupMemberUids.includes(u.uid));
  const nonMemberContacts = contacts.filter(c => !activeGroupMemberUids.includes(c.uid));

  return (
    <div className="flex w-full h-[100dvh] bg-[#0f172a] font-sans overflow-hidden text-[#f1f5f9] select-none md:select-auto" onClick={() => {setOpenMenuId(null); setShowFabMenu(false); setShowRoomOptions(null);}}>
      <style>{`.hide-scroll::-webkit-scrollbar { display: none; } .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

      {/* TOAST MINI */}
      {sysToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[1000] bg-[#1e293b] border border-[#3b82f6]/50 text-[#f1f5f9] px-4 py-2 rounded-full shadow-2xl text-xs font-medium pointer-events-none animate-bounce">
          {sysToast}
        </div>
      )}

      {/* MODAL PENGATURAN NOTIFIKASI DESAIN ENTERPRISE ELEGAN */}
      {modalConfig.type === 'notifSettings' && (
        <div className="fixed inset-0 z-[750] bg-[#020617]/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setModalConfig({ type: null })}>
          <div className="bg-gradient-to-b from-[#1e293b] to-[#0f172a] w-full max-w-md rounded-3xl border border-[#334155]/80 shadow-[0_25px_70px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-[#334155]/60 flex justify-between items-center bg-[#0f172a]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#10b981]/20 to-[#3b82f6]/20 border border-[#10b981]/30 flex items-center justify-center shadow-inner">
                  <Bell className="text-[#10b981]" size={20}/>
                </div>
                <div>
                  <h2 className="font-bold text-[#f8fafc] text-base tracking-tight">Preferensi Notifikasi</h2>
                  <p className="text-[11px] text-[#64748b]">Pengaturan suara, getar & layar MD Chat</p>
                </div>
              </div>
              <button onClick={() => setModalConfig({ type: null })} className="text-[#64748b] hover:text-white p-2 rounded-xl hover:bg-[#1e293b] transition"><X size={18}/></button>
            </div>

            <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[80vh] hide-scroll">
              <div className="bg-[#0f172a]/90 p-4 rounded-2xl border border-[#334155]/70 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${notifPermission === 'granted' ? 'bg-[#10b981] shadow-[0_0_10px_#10b981]' : 'bg-[#eab308] animate-ping'}`}></span>
                  <div>
                    <p className="text-xs font-bold text-[#f1f5f9]">Izin Sistem Operasi & Browser</p>
                    <p className="text-[11px] text-[#94a3b8] mt-0.5">
                      {notifPermission === 'granted' ? 'Notifikasi Latar Belakang Aktif' : 'Izin Pop-up Belum Diaktifkan'}
                    </p>
                  </div>
                </div>
                {notifPermission !== 'granted' ? (
                  <button onClick={requestNotificationPermission} className="bg-gradient-to-r from-[#10b981] to-[#059669] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg hover:opacity-95 transition">
                    Aktifkan
                  </button>
                ) : (
                  <button onClick={() => triggerExternalNotification("MD Chat", "Tes Pop-up Banner & Nada Dering Berhasil!", APP_LOGO, true)} className="bg-[#1e293b] hover:bg-[#334155] border border-[#3b82f6]/40 text-[#3b82f6] text-xs font-bold px-3.5 py-2 rounded-xl transition">
                    Uji Notif
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-bold text-[#f8fafc]">Notifikasi Pesan Masuk</p>
                  <p className="text-[11px] text-[#64748b]">Tampilkan pemberitahuan saat aplikasi di latar belakang</p>
                </div>
                <button
                  onClick={() => setNotifSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`w-12 h-6 rounded-full transition-all duration-300 p-0.5 flex items-center ${notifSettings.enabled ? 'bg-gradient-to-r from-[#10b981] to-[#059669] justify-end shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-[#334155] justify-start'}`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md"></div>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest px-1">Target Perangkat Aktif</label>
                <div className="bg-[#0f172a] p-1 rounded-2xl border border-[#334155]/70 grid grid-cols-3 gap-1">
                  {[
                    { id: 'both', label: 'Semua' },
                    { id: 'mobile', label: 'Hanya HP' },
                    { id: 'desktop', label: 'Desktop' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setNotifSettings(prev => ({ ...prev, targetDevice: opt.id }))}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                        notifSettings.targetDevice === opt.id
                          ? 'bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white shadow-md'
                          : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#0f172a]/80 p-4 rounded-2xl border border-[#334155]/70 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${notifSettings.soundEnabled ? 'bg-[#3b82f6]/15 text-[#3b82f6]' : 'bg-[#1e293b] text-[#64748b]'}`}>
                      {notifSettings.soundEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#f1f5f9]">Nada Dering Pesan</p>
                      <p className="text-[10px] text-[#64748b]">Suara notifikasi saat pesan tiba</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                    className={`w-11 h-6 rounded-full transition-all p-0.5 flex items-center ${notifSettings.soundEnabled ? 'bg-[#3b82f6] justify-end' : 'bg-[#334155] justify-start'}`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow"></div>
                  </button>
                </div>

                {notifSettings.soundEnabled && (
                  <div className="flex flex-col gap-2 pt-1 border-t border-[#1e293b]">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#94a3b8] font-medium">Tingkat Volume</span>
                      <span className="font-bold text-[#3b82f6] bg-[#3b82f6]/10 px-2 py-0.5 rounded-md">{notifSettings.volume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={notifSettings.volume}
                      onChange={(e) => setNotifSettings(prev => ({ ...prev, volume: Number(e.target.value) }))}
                      onMouseUp={() => playNotificationSound(notifSettings.volume)}
                      onTouchEnd={() => playNotificationSound(notifSettings.volume)}
                      className="w-full h-1.5 bg-[#1e293b] rounded-lg accent-[#3b82f6] cursor-pointer"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#1e293b]">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${notifSettings.vibrateEnabled ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-[#1e293b] text-[#64748b]'}`}>
                      <Smartphone size={16}/>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#f1f5f9]">Getaran Haptic (HP)</p>
                      <p className="text-[10px] text-[#64748b]">Pola getar aktif saat notifikasi masuk</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const nextVal = !notifSettings.vibrateEnabled;
                      setNotifSettings(prev => ({ ...prev, vibrateEnabled: nextVal }));
                      if (nextVal && navigator.vibrate) navigator.vibrate([200, 100, 200]);
                    }}
                    className={`w-11 h-6 rounded-full transition-all p-0.5 flex items-center ${notifSettings.vibrateEnabled ? 'bg-[#10b981] justify-end' : 'bg-[#334155] justify-start'}`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADMIN: KELOLA & BLOKIR AKUN PENGGUNA */}
      {modalConfig.type === 'manageUsers' && isAdmin && (
        <div className="fixed inset-0 z-[750] bg-[#020617]/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setModalConfig({ type: null })}>
          <div className="bg-[#1e293b] w-full max-w-md rounded-3xl border border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[#334155] flex justify-between items-center bg-[#0f172a]">
              <h2 className="font-bold text-[#f1f5f9] text-base flex items-center gap-2">
                <ShieldAlert className="text-[#ef4444]" size={18}/> Kelola Akun MD Chat ({contacts.length})
              </h2>
              <button onClick={() => setModalConfig({ type: null })} className="text-[#94a3b8] hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto hide-scroll flex flex-col gap-2">
              {contacts.length === 0 && <p className="text-xs text-[#64748b] text-center py-6">Tidak ada akun lain yang terdaftar.</p>}
              {contacts.map(c => (
                <div key={c.uid} className="flex items-center justify-between p-3 bg-[#0f172a] rounded-2xl border border-[#334155]">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={c.photo} alt={c.name} className="w-10 h-10 rounded-full shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#f1f5f9] truncate">{c.name}</p>
                      <p className="text-[11px] text-[#64748b] truncate">{c.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdminDeleteUserAccount(c)}
                    className="bg-[#ef4444]/15 hover:bg-[#ef4444] text-[#ef4444] hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ml-2"
                  >
                    Keluarkan
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS PESAN */}
      {deleteModalTargets && (
        <div className="fixed inset-0 z-[700] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteModalTargets(null)}>
          <div className="bg-[#1e293b] w-full max-w-xs rounded-2xl border border-[#334155] shadow-2xl p-5 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-[#f1f5f9] text-sm">Hapus {deleteModalTargets.length} pesan?</h3>
            <p className="text-xs text-[#94a3b8]">
              {canDeleteForEveryone
                ? "Pilih apakah pesan ingin dihapus untuk semua orang atau hanya untuk Anda sendiri:"
                : "Pesan dari orang lain hanya dapat dihapus untuk tampilan Anda sendiri:"}
            </p>
            <div className="flex flex-col gap-2 mt-2">
              {canDeleteForEveryone && (
                <button onClick={executeDeleteForEveryone} className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#ef4444] text-white hover:bg-[#dc2626] transition text-center">
                  Hapus untuk Semua Orang
                </button>
              )}
              <button onClick={executeDeleteForMe} className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#0f172a] text-[#f1f5f9] border border-[#334155] hover:bg-[#334155] transition text-center">
                Hapus untuk Saya
              </button>
              <button onClick={() => setDeleteModalTargets(null)} className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-[#94a3b8] hover:text-white transition text-center mt-1">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORWARD INTERNAL & WA */}
      {modalConfig.type === 'forward' && (
         <div className="fixed inset-0 z-[600] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-[#1e293b] w-full max-w-md rounded-2xl border border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
             <div className="p-4 border-b border-[#334155] flex justify-between items-center bg-[#0f172a]">
               <h2 className="font-bold text-[#f1f5f9] text-base flex items-center gap-2"><Share2 className="text-[#3b82f6]" size={18}/> Teruskan Ke...</h2>
               <button onClick={() => {setModalConfig({type:null}); setForwardTargets([]);}} className="text-[#94a3b8] hover:text-white"><X size={20}/></button>
             </div>
             
             <div className="p-4 border-b border-[#334155] bg-[#0f172a]">
                <button onClick={() => handleForwardToWA(visibleMessages.filter(m => selectedMessages.includes(m.id)))} className="w-full bg-[#10b981] hover:bg-[#059669] text-white py-2.5 rounded-xl font-medium transition flex items-center justify-center gap-2 text-sm">
                   <Smartphone size={16} /> Teruskan ke Luar (WhatsApp)
                </button>
             </div>

             <div className="p-3 bg-[#1e293b] flex-1 flex flex-col min-h-0">
                <p className="text-xs text-[#64748b] font-semibold uppercase px-2 mb-2">Atau teruskan ke Kontak MD Chat:</p>
                <div className="flex items-center bg-[#0f172a] rounded-xl px-3 py-1.5 border border-[#334155] mb-2">
                  <Search size={14} className="text-[#64748b]" />
                  <input type="text" value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Cari nama kontak / grup..." className="bg-transparent border-none outline-none text-xs text-white w-full ml-2" />
                </div>
                
                <div className="overflow-y-auto flex-1 hide-scroll">
                   {allForwardOptions.map(opt => {
                     const isSelected = forwardTargets.some(t => t.id === opt.id);
                     return (
                       <div key={opt.id} onClick={() => toggleForwardTarget(opt)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${isSelected ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/50' : 'hover:bg-[#334155] border border-transparent'}`}>
                         <div className="shrink-0">{isSelected ? <CheckSquare size={18} className="text-[#3b82f6]" /> : <Square size={18} className="text-[#64748b]" />}</div>
                         <img src={opt.photo} alt={opt.name} className="w-10 h-10 rounded-full" />
                         <p className="font-medium text-[#f1f5f9] text-sm truncate flex-1">{opt.name}</p>
                       </div>
                     )
                   })}
                </div>

                {forwardTargets.length > 0 && (
                  <button onClick={executeInternalForward} className="w-full mt-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white py-2.5 rounded-xl font-medium transition flex items-center justify-center gap-2 text-sm">
                     <Send size={16} /> Kirim ke {forwardTargets.length} tujuan
                  </button>
                )}
             </div>
           </div>
         </div>
      )}

      {/* PREVIEW GAMBAR MODAL */}
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

      {/* POP-UP BUAT GRUP / JAPRI */}
      {(modalConfig.type === 'group' || modalConfig.type === 'japri') && (
        <div className="fixed inset-0 z-[400] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e293b] w-full max-w-md rounded-2xl border border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#334155] flex justify-between items-center bg-[#0f172a]">
              <h2 className="font-bold text-[#f1f5f9] text-base flex items-center gap-2">
                {modalConfig.type === 'group' ? <Users className="text-[#3b82f6]" size={18}/> : <User className="text-[#10b981]" size={18}/>}
                {modalConfig.type === 'group' ? 'New Group' : 'New Chat'}
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
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#f1f5f9] truncate text-sm">{c.name}</p>
                          <p className="text-[11px] text-[#64748b] truncate">{c.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LAYAR PRA-KIRIM FILE DENGAN INDIKATOR LOADING & ANTI-SPAM KLIK */}
      {pendingUploadFile && (
        <div className="fixed inset-0 z-[300] bg-[#020617]/95 flex flex-col backdrop-blur-sm">
           <div className="h-16 flex items-center px-4 shrink-0 border-b border-[#334155]">
            <button
              disabled={isUploading}
              onClick={() => { if (!isUploading) { setPendingUploadFile(null); setPendingPreviewUrl(null); } }}
              className="text-[#94a3b8] p-2 hover:bg-[#1e293b] rounded-full transition disabled:opacity-40"
            >
              <X size={26} />
            </button>
            <span className="text-[#f1f5f9] ml-4 font-semibold">Kirim ke {activeGroup?.displayName}</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden relative">
            {pendingPreviewUrl ? (
              <img src={pendingPreviewUrl} alt="Preview" className={`max-w-full max-h-full rounded-lg drop-shadow-2xl transition ${isUploading ? 'opacity-40 scale-95' : ''}`} />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <FileText size={90} className="text-[#3b82f6]" />
                <p className="text-sm font-bold text-[#f1f5f9]">{pendingUploadFile.name}</p>
              </div>
            )}

            {isUploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617]/60 backdrop-blur-xs">
                <div className="bg-[#1e293b] border border-[#334155] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                  <Loader2 size={24} className="text-[#10b981] animate-spin" />
                  <div>
                    <p className="text-sm font-bold text-white">Mengunggah File...</p>
                    <p className="text-[11px] text-[#94a3b8]">Mohon tunggu, jangan tutup layar ini</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="bg-[#0f172a] px-4 py-4 flex items-end gap-3 border-t border-[#334155]">
            <textarea
              disabled={isUploading}
              value={uploadCaption}
              onChange={(e) => setUploadCaption(e.target.value)}
              rows={1}
              placeholder="Tambahkan keterangan..."
              className="flex-1 py-3 px-5 bg-[#1e293b] rounded-xl border border-[#334155] outline-none text-[#f1f5f9] hide-scroll disabled:opacity-50"
            />
            <button
              onClick={confirmUpload}
              disabled={isUploading}
              className={`px-5 py-3.5 rounded-xl font-bold text-sm transition flex items-center gap-2 shrink-0 ${
                isUploading
                  ? 'bg-[#334155] text-[#94a3b8] cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#10b981] to-[#059669] hover:opacity-95 text-white shadow-lg cursor-pointer'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 size={20} className="animate-spin text-[#10b981]" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <Send size={20} className="text-white" />
                  <span>Kirim</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* SIDEBAR KIRI */}
      <div className={`${isMobileChatOpen ? 'hidden md:flex' : 'flex'} w-full md:w-[30%] lg:w-[25%] border-r border-[#1e293b] bg-[#0f172a] flex-col h-full z-10 shrink-0 shadow-2xl relative`}>
        
        <div className="absolute bottom-5 right-5 z-50">
          {showFabMenu && (
             <div className="absolute bottom-14 right-0 bg-[#1e293b] rounded-xl shadow-2xl border border-[#334155] p-2 flex flex-col gap-1 w-44 mb-2 origin-bottom-right" onClick={e => e.stopPropagation()}>
               <button onClick={(e) => {e.stopPropagation(); setModalConfig({type: 'japri'}); setShowFabMenu(false);}} className="flex items-center gap-3 px-3 py-2 hover:bg-[#334155] rounded-lg text-xs text-[#f1f5f9] font-semibold"><User size={15} className="text-[#10b981]"/> New Chat</button>
               <button onClick={(e) => {e.stopPropagation(); setModalConfig({type: 'group'}); setShowFabMenu(false);}} className="flex items-center gap-3 px-3 py-2 hover:bg-[#334155] rounded-lg text-xs text-[#f1f5f9] font-semibold"><Users size={15} className="text-[#3b82f6]"/> New Group</button>
               {isAdmin && (
                 <button onClick={(e) => {e.stopPropagation(); setModalConfig({type: 'manageUsers'}); setShowFabMenu(false);}} className="flex items-center gap-3 px-3 py-2 hover:bg-[#334155] rounded-lg text-xs text-[#ef4444] font-semibold border-t border-[#334155]"><ShieldAlert size={15}/> Kelola Akun</button>
               )}
             </div>
          )}
          <button onClick={(e) => {e.stopPropagation(); setShowFabMenu(!showFabMenu);}} className="bg-[#10b981] p-3.5 rounded-full shadow-[0_4px_15px_rgba(16,185,129,0.4)] hover:bg-[#059669] transition-transform hover:scale-105 active:scale-95">
            <Plus size={22} className={`text-white transition-transform duration-300 ${showFabMenu ? 'rotate-45' : 'rotate-0'}`} />
          </button>
        </div>

        <div className="bg-[#0f172a] h-16 flex items-center justify-between px-4 shrink-0 border-b border-[#1e293b]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img src={APP_LOGO} alt="MD Chat" className="w-8 h-8 rounded-lg shadow-md border border-[#334155] shrink-0 object-cover" />
            <img src={user.photoURL} alt="Profil" className="w-8 h-8 rounded-xl shadow-md border border-[#334155] shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-[#f1f5f9] truncate text-[13px]">{user.displayName}</div>
              {isAdmin ? (
                <div className="text-[9px] text-[#00f2fe] font-bold uppercase tracking-wider">MD Chat Admin</div>
              ) : (
                <div className="text-[9px] text-[#94a3b8] font-medium truncate">MD Chat Online</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <button onClick={(e) => { e.stopPropagation(); setModalConfig({ type: 'manageUsers' }); }} className="p-2 rounded-xl text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition" title="Kelola Akun Sistem">
                <Users size={16} />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); setModalConfig({ type: 'notifSettings' }); }} className={`p-2 rounded-xl transition-colors ${notifSettings.enabled && notifPermission === 'granted' ? 'text-[#10b981] hover:bg-[#1e293b]' : 'text-[#eab308] bg-[#eab308]/10 hover:bg-[#eab308]/20'}`} title="Pengaturan Notifikasi">
              {notifSettings.enabled && notifPermission === 'granted' ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
            <button onClick={() => signOut(auth)} className="hover:bg-[#1e293b] p-2 rounded-xl transition-colors text-[#ef4444]" title="Keluar"><LogOut size={16} /></button>
          </div>
        </div>
        
        <div className="p-3 bg-[#0f172a] shrink-0 border-b border-[#1e293b]">
           <div className="bg-[#1e293b] flex items-center rounded-xl px-3 py-2 border border-[#334155] focus-within:border-[#3b82f6] transition-colors">
              <Search size={16} className="text-[#64748b] shrink-0" />
              <input type="text" value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)} onKeyDown={handleGlobalSearch} placeholder="Cari di MD Chat (Enter utk Global)..." className="bg-transparent border-none outline-none ml-2 w-full text-xs text-[#f1f5f9] placeholder-[#64748b]" />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#0f172a] p-2 hide-scroll">
          {globalSearchResults ? (
             <div className="p-2">
                <div className="flex justify-between items-center mb-3"><span className="text-xs text-[#3b82f6] font-bold uppercase">Hasil Global ({globalSearchResults.length})</span> <button onClick={()=>setGlobalSearchResults(null)} className="text-[#ef4444] text-xs font-bold">Tutup</button></div>
                {globalSearchResults.map(res => (
                   <div key={res.id} onClick={() => jumpToMessage(res.id, res.room)} className="bg-[#1e293b] p-3 rounded-lg mb-2 border border-[#334155] cursor-pointer hover:border-[#3b82f6]/50">
                      <p className="text-[10px] text-[#10b981] mb-1 font-bold">{res.room?.displayName} • {res.senderName}</p>
                      <p className="text-xs text-[#f1f5f9] truncate">{res.text || res.fileName}</p>
                   </div>
                ))}
             </div>
          ) : (
             filteredRooms.map(room => {
                const unreadCount = room.badgeCount || 0; 
                return (
                  <div key={room.id} className={`flex items-center p-3 mb-1 rounded-xl transition-all relative ${activeGroup?.id === room.id ? 'bg-[#1e293b] border border-[#334155]' : 'hover:bg-[#1e293b]/50 border border-transparent'}`}>
                    <div className="flex-1 flex items-center min-w-0 cursor-pointer" onClick={() => { setActiveGroup(room); setIsMobileChatOpen(true); }}>
                      <div className="relative">
                        <img src={room.displayAvatar} alt={room.displayName} className={`w-10 h-10 object-cover mr-3 ${room.type === 'private' ? 'rounded-full' : 'rounded-xl'}`} />
                        {room.type === 'private' && <div className="absolute -bottom-0.5 -right-0.5 bg-[#10b981] w-3 h-3 rounded-full border-2 border-[#0f172a]"></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className={`truncate text-[13px] ${unreadCount > 0 ? 'font-bold text-white' : 'font-semibold text-[#f8fafc]'}`}>{room.displayName}</h3>
                          {room.isPinnedRoom && <Pin size={12} className="text-[#3b82f6] shrink-0 rotate-45" />}
                          {room.isMutedRoom && <BellOff size={12} className="text-[#64748b] shrink-0" />}
                        </div>
                        <p className={`text-[11px] truncate pr-2 ${unreadCount > 0 ? 'text-[#3b82f6] font-medium' : 'text-[#64748b]'}`}>{room.formattedPreview}</p>
                      </div>
                      {unreadCount > 0 && <div className={`min-w-[20px] h-5 px-1.5 rounded-full text-white text-[10px] font-bold flex items-center justify-center ml-2 shrink-0 ${room.isMutedRoom ? 'bg-[#64748b]' : 'bg-[#3b82f6]'}`}>{unreadCount > 99 ? '99+' : unreadCount}</div>}
                    </div>

                    <div className="relative shrink-0 ml-1">
                      <button onClick={(e) => { e.stopPropagation(); setShowRoomOptions(showRoomOptions === room.id ? null : room.id); }} className="p-1.5 rounded-lg text-[#64748b] hover:bg-[#334155] hover:text-[#f1f5f9] transition">
                        <MoreVertical size={14} />
                      </button>
                      {showRoomOptions === room.id && (
                        <div className="absolute top-8 right-0 bg-[#0f172a] border border-[#334155] shadow-2xl rounded-xl py-1.5 w-48 z-[200]" onClick={e => e.stopPropagation()}>
                           <button onClick={() => togglePinRoom(room)} className="w-full text-left px-4 py-2 text-xs font-medium text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-2.5">
                             <Pin size={13} className="text-[#3b82f6]" /> {room.isPinnedRoom ? 'Lepas Sematan Chat' : 'Sematkan Percakapan'}
                           </button>
                           <button onClick={() => toggleMuteRoom(room)} className="w-full text-left px-4 py-2 text-xs font-medium text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-2.5 border-b border-[#334155]">
                             {room.isMutedRoom ? <Bell size={13} className="text-[#10b981]" /> : <BellOff size={13} className="text-[#eab308]" />}
                             {room.isMutedRoom ? 'Nyalakan Notifikasi' : 'Matikan Notifikasi'}
                           </button>
                           <button onClick={() => handleDeleteRoom(room.id)} className="w-full text-left px-4 py-2 text-xs font-bold text-[#ef4444] hover:bg-[#1e293b] flex items-center gap-2.5">
                             <Trash2 size={13}/> Hapus Obrolan
                           </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
             })
          )}
        </div>
      </div>

      {/* AREA CHAT TENGAH DENGAN LOGO & BRANDING "MD CHAT" */}
      <div className={`${isMobileChatOpen && !showGroupInfo ? 'flex' : 'hidden md:flex'} flex-1 flex-col w-full h-full bg-[#020617] relative`}>
        
        {!activeGroup ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#070b14]">
             <img src={APP_LOGO} alt="MD Chat Logo" className="w-28 h-28 rounded-3xl mb-4 shadow-[0_0_40px_rgba(56,189,248,0.2)] border border-[#1e293b] object-contain" />
             <h1 className="text-2xl font-black tracking-wider mb-1">
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f2fe] via-[#4facfe] to-[#c471ed]">MD</span>{' '}
               <span className="text-white">CHAT</span>
             </h1>
             <p className="text-[#64748b] text-xs">Pilih percakapan di sebelah kiri untuk memulai.</p>
          </div>
        ) : (
          <>
            <div className="bg-[#0f172a]/90 backdrop-blur-md h-16 flex items-center justify-between px-5 shrink-0 z-20 border-b border-[#1e293b]">
              <div className="flex items-center min-w-0 flex-1 cursor-pointer" onClick={() => setShowGroupInfo(!showGroupInfo)}>
                <button onClick={(e) => { e.stopPropagation(); setIsMobileChatOpen(false); }} className="md:hidden mr-3 text-[#94a3b8]"><ArrowLeft size={20} /></button>
                <img src={activeGroup.displayAvatar} alt="Avatar" className={`w-9 h-9 object-cover mr-3 shadow-sm ${activeGroup.type === 'private' ? 'rounded-full' : 'rounded-xl'}`} />
                <div className="truncate">
                  <h2 className="font-bold text-[#f8fafc] truncate text-[14px] flex items-center gap-2">
                    {activeGroup.displayName}
                    {activeGroup.type === 'private' && <span className="px-1.5 py-0.5 bg-[#10b981]/20 text-[#10b981] text-[8px] rounded uppercase">Private</span>}
                  </h2>
                  <p className="text-[10px] text-[#64748b] truncate">Ketuk untuk info anggota, undangan & file</p>
                </div>
              </div>
              <div className="flex items-center gap-1 relative">
                <button onClick={() => setShowChatSearch(!showChatSearch)} className={`p-2 rounded-xl transition-colors ${showChatSearch ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'text-[#94a3b8] hover:bg-[#1e293b]'}`} title="Cari pesan"><Search size={18} /></button>
                <button onClick={(e) => { e.stopPropagation(); setShowRoomOptions(showRoomOptions === 'chat' ? null : 'chat'); }} className="p-2 rounded-xl transition-colors text-[#94a3b8] hover:bg-[#1e293b]" title="Opsi"><MoreVertical size={18}/></button>
                
                {showRoomOptions === 'chat' && (
                   <div className="absolute top-10 right-0 bg-[#0f172a] border border-[#334155] shadow-2xl rounded-xl py-2 w-52 z-[200]" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setShowGroupInfo(true); setShowRoomOptions(null); }} className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-3"><Users size={14} className="text-[#3b82f6]"/> Anggota & File Grup</button>
                      <button onClick={handleCopyGroupInviteLink} className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-3 border-b border-[#334155]"><Link2 size={14} className="text-[#10b981]"/> Salin Link Undangan</button>
                      <button onClick={handleClearAllMessages} className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#ef4444] hover:bg-[#1e293b] flex items-center gap-3"><Trash2 size={14}/> Bersihkan Isi Chat</button>
                   </div>
                )}
              </div>
            </div>

            {pinnedMessages.length > 0 && (
              <div className="bg-[#1e293b] px-4 py-2 flex items-center gap-3 z-10 border-b border-[#334155] shadow-sm cursor-pointer hover:bg-[#334155] transition" onClick={handlePinClick}>
                 <Star size={16} className="text-[#eab308] shrink-0" />
                 <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#f1f5f9] truncate">Pesan Disematkan {pinnedMessages.length > 1 ? `(${(currentPinIndex % pinnedMessages.length) + 1}/${pinnedMessages.length})` : ''}</p>
                    <p className="text-[10px] text-[#94a3b8] truncate">{(pinnedMessages[currentPinIndex] || pinnedMessages[0]).text || (pinnedMessages[currentPinIndex] || pinnedMessages[0]).fileName}</p>
                 </div>
                 {pinnedMessages.length > 1 && (
                    <div className="text-[10px] text-[#64748b] whitespace-nowrap bg-[#0f172a] px-2 py-1 rounded-lg">Ketuk untuk gilir</div>
                 )}
              </div>
            )}

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

            <div className="flex-1 overflow-y-auto p-4 md:px-12 flex flex-col relative z-0 pb-4 hide-scroll">
              {filteredMessages.map((msg, index) => {
                const isMe = msg.uid === user.uid;
                const isMenuOpen = openMenuId === msg.id;
                const isSelected = selectedMessages.includes(msg.id);
                
                const prevMsg = index > 0 ? filteredMessages[index - 1] : null;
                const isSameSenderAsPrev = prevMsg && prevMsg.uid === msg.uid;
                
                let bubbleShape = 'rounded-2xl'; 
                if (!isSameSenderAsPrev) { 
                   bubbleShape = isMe ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm';
                }
                const marginTop = isSameSenderAsPrev ? 'mt-1' : 'mt-4'; 

                return (
                  <div 
                    key={msg.id} 
                    id={`msg-${msg.id}`} 
                    onTouchStart={() => handleTouchStartMsg(msg.id)}
                    onTouchEnd={handleTouchEndOrMoveMsg}
                    onTouchMove={handleTouchEndOrMoveMsg}
                    onContextMenu={(e) => {
                      if (window.innerWidth <= 768) {
                        e.preventDefault();
                        setIsSelectionMode(true);
                        if (!selectedMessages.includes(msg.id)) setSelectedMessages([...selectedMessages, msg.id]);
                      }
                    }}
                    className={`flex items-center relative ${isMe ? 'justify-end' : 'justify-start'} ${marginTop} group`}
                  >
                    {isSelectionMode && (
                      <div onClick={() => toggleSelection(msg.id)} className="mr-3 cursor-pointer text-[#3b82f6] shrink-0">
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-[#475569]" />}
                      </div>
                    )}
                    <div onClick={() => isSelectionMode && toggleSelection(msg.id)} className={`flex flex-col relative max-w-[85%] md:max-w-[70%] ${isSelectionMode ? 'cursor-pointer' : ''}`}>
                      <div className={`p-2.5 shadow-sm text-[13.5px] relative leading-relaxed border ${bubbleShape}
                        ${isMe ? 'bg-[#10b981]/10 border-[#10b981]/20 text-[#f1f5f9]' : 'bg-[#1e293b] border-[#334155] text-[#f1f5f9]'}
                        ${isSelected ? 'ring-2 ring-[#3b82f6]' : ''}
                        ${msg.isPinned ? 'border-[#eab308]/50 shadow-[0_0_10px_rgba(234,179,8,0.15)]' : ''}
                      `}>
                        {msg.isPinned && <div className="absolute -top-2.5 -right-2.5 bg-[#eab308] p-1 rounded-full text-white shadow-md z-10"><Star size={10} fill="currentColor"/></div>}
                        {msg.isForwarded && <div className="text-[10px] text-[#94a3b8] italic mb-1 flex items-center gap-1"><Share2 size={10}/> Diteruskan</div>}
                        
                        {(!isMe && activeGroup.type !== 'private' && !isSameSenderAsPrev) && (
                           <div className="text-[10px] font-bold text-[#3b82f6] mb-1">{msg.senderName}</div>
                        )}
                        
                        {msg.isImage && (
                          <div className="mb-2 relative cursor-pointer group/media" onClick={() => !isSelectionMode && setPreviewMedia(msg)}>
                            <img src={msg.fileData} className="max-w-full md:max-w-[250px] rounded-lg object-cover border border-[#334155]" alt="Lampiran" />
                          </div>
                        )}
                        {!msg.isImage && msg.fileData && (
                          <div onClick={() => !isSelectionMode && setPreviewMedia(msg)} className="flex items-center gap-2 bg-[#0f172a] p-2.5 rounded-xl mb-1.5 border border-[#334155] hover:border-[#3b82f6]/50 transition cursor-pointer">
                            <div className="w-8 h-8 bg-[#334155] rounded-md flex items-center justify-center shrink-0">
                              <FileText size={16} className="text-[#10b981]" />
                            </div>
                            <div className="flex-1 min-w-0 pr-2"><p className="font-medium text-[#f1f5f9] text-xs truncate">{msg.fileName}</p></div>
                          </div>
                        )}

                        {!isSelectionMode && (
                          <div onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : msg.id); }} className={`absolute top-1.5 right-1.5 cursor-pointer p-1 rounded-md z-20 md:opacity-0 md:group-hover:opacity-100 ${isMenuOpen ? 'opacity-100 bg-[#334155]' : 'hover:bg-[#334155]'}`}>
                            <ChevronDown size={14} className="text-[#94a3b8]" />
                          </div>
                        )}

                        {isMenuOpen && (
                          <div onClick={(e) => e.stopPropagation()} className={`absolute top-6 ${isMe ? 'right-0' : 'left-5'} bg-[#0f172a] border border-[#334155] shadow-2xl rounded-xl py-1.5 w-44 z-[100]`}>
                            <button onClick={() => handleCopyMessages([msg])} className="w-full text-left px-4 py-2 text-xs font-medium text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-3"><Copy size={12} className="text-[#10b981]" /> Salin Pesan</button>
                            <button onClick={() => togglePinMessage(msg)} className="w-full text-left px-4 py-2 text-xs font-medium text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-3"><Star size={12} className="text-[#eab308]" /> {msg.isPinned ? 'Lepas Sematan' : 'Sematkan Pesan'}</button>
                            <button onClick={() => {setModalConfig({type: 'forward'}); setIsSelectionMode(true); setSelectedMessages([msg.id]); setOpenMenuId(null);}} className="w-full text-left px-4 py-2 text-xs font-medium text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-3"><Share2 size={12} className="text-[#3b82f6]" /> Teruskan Chat</button>
                            <button onClick={() => {setIsSelectionMode(true); setSelectedMessages([msg.id]); setOpenMenuId(null);}} className="w-full text-left px-4 py-2 text-xs font-medium text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-3 border-b border-[#334155]"><CheckSquare size={12} className="text-[#10b981]"/> Pilih Pesan</button>
                            {isMe && <button onClick={() => startEditing(msg)} className="w-full text-left px-4 py-2 text-xs font-medium text-[#cbd5e1] hover:bg-[#1e293b] flex items-center gap-3"><Edit2 size={12} className="text-[#eab308]" /> Edit Pesan</button>}
                            <button onClick={() => openDeleteConfirmation(msg.id)} className="w-full text-left px-4 py-2 text-xs font-medium text-[#ef4444] hover:bg-[#1e293b] flex items-center gap-3"><Trash2 size={12} /> Hapus Pesan</button>
                          </div>
                        )}
                        
                        {msg.text && <div dangerouslySetInnerHTML={formatText(msg.text)} className="pr-5 select-text" />}
                        
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
              <div className="bg-[#0f172a]/90 backdrop-blur-md px-4 py-2.5 flex justify-between items-center z-10 border-t border-[#1e293b]">
                <button onClick={() => { setIsSelectionMode(false); setSelectedMessages([]); }} className="text-[#94a3b8] text-xs font-bold p-2 hover:bg-[#1e293b] rounded-lg">Batal</button>
                <div className="flex gap-2">
                  <button onClick={() => handleCopyMessages(visibleMessages.filter(m => selectedMessages.includes(m.id)))} disabled={selectedMessages.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 hover:bg-[#10b981]/20 disabled:opacity-50">
                    <Copy size={14} /> Salin
                  </button>
                  <button onClick={() => setModalConfig({type: 'forward'})} disabled={selectedMessages.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 hover:bg-[#3b82f6]/20 disabled:opacity-50">
                    <Share2 size={14} /> Teruskan
                  </button>
                  <button onClick={() => openDeleteConfirmation()} disabled={selectedMessages.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/20 disabled:opacity-50">
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="bg-[#0f172a]/90 backdrop-blur-md px-4 py-2.5 flex items-end gap-2 shrink-0 z-10 border-t border-[#1e293b]">
                <input type="file" ref={fileInputRef} onChange={handleFileSelection} className="hidden" />
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

      {/* SIDEBAR INFO GRUP KANAN */}
      {showGroupInfo && activeGroup && (
        <div className={`w-full md:w-[310px] lg:w-[350px] border-l border-[#1e293b] bg-[#0f172a] flex-col h-full z-20 absolute right-0 md:relative ${showGroupInfo ? 'flex' : 'hidden'} shadow-2xl`}>
          <div className="bg-[#0f172a] h-16 flex items-center px-4 shrink-0 border-b border-[#1e293b] gap-2">
            <button onClick={() => setShowGroupInfo(false)} className="text-[#94a3b8] hover:bg-[#1e293b] p-1.5 rounded-lg"><X size={16} /></button>
            <span className="text-[#f1f5f9] font-bold text-[13px]">Detail & Pengaturan Obrolan</span>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#020617] hide-scroll">
            <div className="flex flex-col items-center py-6 bg-[#0f172a] mb-2 border-b border-[#1e293b]">
              <div className="relative group cursor-pointer mb-3">
                <img src={activeGroup.displayAvatar} alt="Avatar" className={`w-20 h-20 object-cover border-4 border-[#1e293b] shadow-xl ${activeGroup.type === 'private' ? 'rounded-full' : 'rounded-2xl'}`} />
                {(isAdmin || activeGroup.createdBy === user.uid) && (
                  <div onClick={() => groupPhotoInputRef.current?.click()} className="absolute inset-0 bg-black/50 rounded-2xl md:opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <Camera className="text-white" size={24} />
                  </div>
                )}
                <input type="file" ref={groupPhotoInputRef} onChange={handleUpdateGroupPhoto} accept="image/*" className="hidden" />
              </div>
              <div className="flex items-center gap-2 px-4 text-center">
                <h2 className="text-[#f8fafc] text-base font-bold truncate">{activeGroup.displayName}</h2>
                {(isAdmin || activeGroup.createdBy === user.uid) && (
                  <button onClick={handleEditGroupName} className="text-[#3b82f6] hover:bg-[#1e293b] p-1 rounded-md shrink-0"><Edit3 size={14} /></button>
                )}
              </div>
            </div>

            {activeGroup.type === 'group' && (
              <div className="bg-[#0f172a] p-4 mb-2 border-y border-[#1e293b]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[#f1f5f9] font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={13} className="text-[#10b981]"/> Anggota Grup ({groupMemberObjects.length})
                  </h3>
                  <button onClick={handleCopyGroupInviteLink} className="text-[11px] font-bold text-[#3b82f6] hover:underline flex items-center gap-1">
                    <Link2 size={12}/> Salin Link Join
                  </button>
                </div>

                <form onSubmit={handleSendEmailInvite} className="mb-4 bg-[#1e293b]/70 p-2.5 rounded-xl border border-[#334155]">
                  <label className="block text-[10px] font-bold text-[#94a3b8] uppercase mb-1.5">Undang Anggota via Email</label>
                  <div className="flex gap-1.5">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="ketik.email@gmail.com"
                      className="flex-1 bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#10b981]"
                    />
                    <button type="submit" className="bg-[#10b981] hover:bg-[#059669] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition">
                      <Mail size={13}/> Undang
                    </button>
                  </div>
                </form>

                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto hide-scroll">
                  {groupMemberObjects.map(mem => (
                    <div key={mem.uid} className="flex items-center justify-between p-2 rounded-xl bg-[#1e293b]/50 border border-[#334155]/60">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={mem.photo} alt={mem.name} className="w-7 h-7 rounded-full shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#f1f5f9] truncate">{mem.name}</p>
                          <p className="text-[10px] text-[#64748b] truncate">{mem.email}</p>
                        </div>
                      </div>
                      {(isAdmin || activeGroup.createdBy === user.uid) && mem.uid !== user.uid && (
                        <button
                          onClick={() => handleRemoveMemberFromGroup(mem)}
                          className="p-1.5 rounded-lg text-[#ef4444] hover:bg-[#ef4444]/15 transition shrink-0"
                          title="Keluarkan dari Grup"
                        >
                          <UserMinus size={14}/>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {(isAdmin || activeGroup.createdBy === user.uid) && nonMemberContacts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#1e293b]">
                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase mb-2">Tambahkan Kontak ke Grup:</p>
                    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto hide-scroll">
                      {nonMemberContacts.map(c => (
                        <div key={c.uid} className="flex items-center justify-between p-2 rounded-xl bg-[#020617]/60 border border-[#334155]/40">
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={c.photo} alt={c.name} className="w-6 h-6 rounded-full shrink-0" />
                            <p className="text-xs text-[#cbd5e1] truncate">{c.name}</p>
                          </div>
                          <button
                            onClick={() => handleAddMemberToGroup(c)}
                            className="px-2.5 py-1 rounded-lg bg-[#3b82f6]/20 hover:bg-[#3b82f6] text-[#3b82f6] hover:text-white text-[10px] font-bold flex items-center gap-1 transition shrink-0"
                          >
                            <UserPlus size={12}/> Tambah
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="bg-[#0f172a] p-4 min-h-[300px] border-t border-[#1e293b]">
              <h3 className="text-[#f1f5f9] font-bold text-[11px] mb-3 uppercase tracking-wider flex items-center gap-1.5"><FileText size={12} className="text-[#3b82f6]"/> File Terkirim</h3>
              <div className="flex flex-col gap-2">
                {visibleMessages.filter(m => m.fileData).length === 0 && <p className="text-[#64748b] text-[11px]">Belum ada file.</p>}
                {visibleMessages.filter(m => m.fileData).map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-2 bg-[#1e293b] rounded-xl border border-[#334155] hover:border-[#3b82f6]/50 transition">
                    <div className="w-8 h-8 bg-[#334155] rounded-lg flex items-center justify-center shrink-0">
                      {m.isImage ? <img src={m.fileData} className="w-full h-full object-cover rounded-lg" /> : <FileText size={14} className="text-[#10b981]" />}
                    </div>
                    <div className="flex-1 min-w-0 pr-1">
                      <p className="font-medium text-[#f1f5f9] text-[11px] truncate">{m.fileName}</p>
                    </div>
                    <button onClick={() => jumpToMessage(m.id)} className="p-1.5 bg-[#0f172a] rounded-lg hover:bg-[#3b82f6]/20 hover:text-[#3b82f6] transition text-[#94a3b8] shrink-0" title="Lihat di Chat"><Eye size={14}/></button>
                    <button onClick={() => handleForceDownload(m.fileData)} className="p-1.5 bg-[#0f172a] rounded-lg hover:bg-[#10b981]/20 hover:text-[#10b981] transition text-[#94a3b8] shrink-0" title="Unduh File"><Download size={14}/></button>
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