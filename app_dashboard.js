document.addEventListener('DOMContentLoaded', () => { 
  // ======= UTILITY FUNCTIONS =======
  function uid(prefix = 'id') { return prefix + '_' + Math.random().toString(36).slice(2, 9); }
  function lsGet(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }
  function lsSet(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  // ======= INITIALIZE STORAGE =======
  if (!localStorage.getItem('attendease_classes')) {
    const cls = [];
    for (let i = 1; i <= 12; i++) { ['A', 'B', 'C'].forEach(s => cls.push({ name: 'Class ' + i + s, number: i, section: s })); }
    lsSet('attendease_classes', cls);
  }
  ['attendease_schools', 'attendease_users', 'attendease_students', 'attendease_attendance', 'attendease_notifications', 'attendease_assigns']
    .forEach(k => { if (!localStorage.getItem(k)) lsSet(k, []); });

  // ======= CURRENT USER =======
  const current = lsGet('attendease_current', null);
  if (!current || !current.id) { alert('Please login first'); window.location.href = 'login.html'; return; }

  // ======= ELEMENTS =======
  const navManage = document.getElementById('nav-manage') || document.getElementById('nav-attendance');
  const navRep = document.getElementById('nav-rep');
  const navNot = document.getElementById('nav-not');
  const navSet = document.getElementById('nav-set');
  const viewManage = document.getElementById('view_manage') || document.getElementById('view_attendance');
  const viewRep = document.getElementById('view_reports');
  const viewNot = document.getElementById('view_notifications');
  const viewSet = document.getElementById('view_settings');
  const userInfo = document.getElementById('user_info');

  function showView(v) {
    [viewManage, viewRep, viewNot, viewSet].forEach(x => x.classList.add('hidden'));
    if (v === 'manage' || v === 'attendance') viewManage.classList.remove('hidden');
    if (v === 'reports') viewRep.classList.remove('hidden');
    if (v === 'notifications') viewNot.classList.remove('hidden');
    if (v === 'settings') viewSet.classList.remove('hidden');
  }

  [navManage, navRep, navNot, navSet].forEach((btn, idx) => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      const views = ['manage', 'reports', 'notifications', 'settings'];
      showView(views[idx]);
      if (views[idx] === 'manage' || views[idx] === 'attendance') renderManage();
      if (views[idx] === 'reports') renderReports();
      if (views[idx] === 'notifications') renderNotifications();
      if (views[idx] === 'settings') renderSettings();
    });
  });

  userInfo.innerHTML = `<div class="font-semibold">${current.name || current.username}</div><div class="text-xs" style="color:#8b98a6">${current.role}</div>`;
  document.getElementById('logout')?.addEventListener('click', () => { localStorage.removeItem('attendease_current'); window.location.href = 'landing.html'; });
  document.getElementById('logout2')?.addEventListener('click', () => { localStorage.removeItem('attendease_current'); window.location.href = 'landing.html'; });

  // ======= FILTER FUNCTIONS =======
  const myUsers = () => lsGet('attendease_users', []).filter(u => u.schoolId === current.schoolId);
  const myStudents = () => lsGet('attendease_students', []).filter(s => s.schoolId === current.schoolId);
  const myAssigns = () => lsGet('attendease_assigns', []).filter(a => a.schoolId === current.schoolId);
  const myNotifications = () => lsGet('attendease_notifications', []).filter(n => n.schoolId === current.schoolId);

  // helper - hide/show card by inner element id
  function setCardVisibility(innerId, visible) {
    const el = document.getElementById(innerId);
    if (!el) return;
    const card = el.closest('.card') || el.closest('.glass') || el.parentElement;
    if (card) card.style.display = visible ? '' : 'none';
  }

  // ======= RENDER FUNCTIONS =======
  function renderManage() {
    // toggle visibility of teacher/assignment cards for teacher role
    if (current.role === 'teacher') {
      setCardVisibility('teacher_list', false);
      setCardVisibility('assign_list', false);
    } else {
      setCardVisibility('teacher_list', true);
      setCardVisibility('assign_list', true);
    }

    if (current.role === 'admin') renderAdminManage();
    else if (current.role === 'teacher') renderTeacherManage();
  }

  // ======= ADMIN MANAGEMENT =======
  function renderAdminManage() {
    const teachers = myUsers().filter(u => u.role === 'teacher');
    const tList = document.getElementById('teacher_list'); if (tList) tList.innerHTML = '';
    teachers.forEach(t => {
      if (!tList) return;
      const li = document.createElement('li');
      li.className = 'py-1 flex justify-between';
      li.innerHTML = `
  <span>
    ${t.name} <small style="color:#94a3b8">(${t.username})</small>
  </span>
  <div class="flex gap-2">
    <button data-id="${t.id}" class="show-cred text-blue-400">Show Credentials</button>
    <button data-id="${t.id}" class="del-teacher" style="color:#fb7185">Delete</button>
  </div>
`;
      tList.appendChild(li);
    });

    // Show teacher credentials
    document.querySelectorAll('.show-cred').forEach(b => b.onclick = e => {
      const id = e.target.dataset.id;
      const teacher = myUsers().find(x => x.id === id);
      if (teacher) {
        alert(`Username: ${teacher.username}\nPassword: ${teacher.password}`);
      }
    });

    document.querySelectorAll('.del-teacher').forEach(b => b.onclick = e => {
      const id = e.target.dataset.id;
      lsSet('attendease_users', lsGet('attendease_users', []).filter(x => x.id !== id));
      renderAdminManage();
    });

    // Ensure selects are reset before populating
    const assignTeacherSel = document.getElementById('assign_teacher'); if (assignTeacherSel) { assignTeacherSel.innerHTML = ''; }
    teachers.forEach(t => { if (assignTeacherSel) { const o = document.createElement('option'); o.value = t.id; o.text = t.name; assignTeacherSel.appendChild(o); } });

    const classes = lsGet('attendease_classes', []);
    const classSel = document.getElementById('add_student_class');
    const assignClassSel = document.getElementById('assign_class');
    const rollSel = document.getElementById('add_student_roll');
    if (classSel) classSel.innerHTML = '';
    if (assignClassSel) assignClassSel.innerHTML = '';
    if (rollSel) rollSel.innerHTML = '';
    for (let r = 1; r <= 50; r++) { if (rollSel) { const ro = document.createElement('option'); ro.value = r; ro.text = 'Roll ' + r; rollSel.appendChild(ro); } }
    classes.forEach(c => {
      [classSel, assignClassSel].forEach(sel => { if (sel) { const o = document.createElement('option'); o.value = c.name; o.text = c.name; sel.appendChild(o); } });
    });

    // Add student (admin) - use onclick to avoid multiple handlers
    const addStudentBtn = document.getElementById('add_student_btn');
    if (addStudentBtn) {
      addStudentBtn.onclick = () => {
        const nameEl = document.getElementById('add_student_name');
        const clsEl = document.getElementById('add_student_class');
        const rollEl = document.getElementById('add_student_roll');
        if (!nameEl || !clsEl || !rollEl) return;
        const name = nameEl.value.trim();
        const cls = clsEl.value;
        const roll = rollEl.value;
        if (!name || !cls) { alert('Enter student name and class'); return; }
        const studsAll = lsGet('attendease_students', []);
        // Prevent exact duplicates (same name, class, roll for same school)
        if (studsAll.some(s => s.name.toLowerCase() === name.toLowerCase() && s.class === cls && String(s.roll) === String(roll) && s.schoolId === current.schoolId)) {
          alert('A student with same name, class and roll already exists.');
          return;
        }
        if (studsAll.some(s => s.class === cls && String(s.roll) === String(roll) && s.schoolId === current.schoolId)) {
          if (!confirm('Roll ' + roll + ' already used in this class. Continue anyway?')) return;
        }
        const ref = 'REF' + Math.random().toString(36).slice(2, 8).toUpperCase();
        const qrUrl = 'https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=' + encodeURIComponent(ref);
        studsAll.push({ id: uid('s'), name, class: cls, roll: Number(roll), ref, schoolId: current.schoolId, qr: qrUrl });
        lsSet('attendease_students', studsAll);
        nameEl.value = '';
        renderAdminManage();
      };
    }

    // --------- ADD TEACHER (FIX) ----------
    const addTeacherBtn = document.getElementById('add_teacher_btn');
    if (addTeacherBtn) {
      addTeacherBtn.onclick = () => {
        const nameEl = document.getElementById('add_teacher_name');
        if (!nameEl) return;
        const name = nameEl.value.trim();
        if (!name) { alert('Enter teacher name'); return; }

        // create unique username & password
        const baseUser = name.toLowerCase().replace(/\s+/g, '.');
        const users = lsGet('attendease_users', []);
        let username = baseUser;
        let suffix = 1;
        while (users.some(u => u.username === username && u.schoolId === current.schoolId)) {
          username = baseUser + suffix;
          suffix++;
        }
        const password = Math.random().toString(36).slice(2, 8);

        const teacher = {
          id: uid('u'),
          name,
          username,
          password,
          role: 'teacher',
          schoolId: current.schoolId
        };

        users.push(teacher);
        lsSet('attendease_users', users);
        nameEl.value = '';
        alert(`Teacher added!\nUsername: ${username}\nPassword: ${password}`);
        renderAdminManage();
      };
    }

    // Render students + QR for admin
    const studs = myStudents();
    const sList = document.getElementById('student_list'); if (sList) sList.innerHTML = '';
    studs.forEach(s => {
      if (!sList) return;
      const li = document.createElement('li');
      li.className = 'py-1 flex justify-between items-center';
      li.innerHTML = `<div>\n                        <div>${s.name} <small style=\"color:#94a3b8\">(${s.class})</small></div>\n                        <div style=\"color:#94a3b8; font-size:12px\">Roll: <strong>${s.roll || '-'}<\/strong> · Ref: <span style=\"font-family:monospace\">${s.ref}<\/span><\/div>\n                      <\/div>\n                      <div>\n                        <button data-id=\"${s.id}\" class=\"gen-qr text-sm px-2 py-1 mr-2\" style=\"background:rgba(255,255,255,0.06);border-radius:6px\">Generate QR<\/button>\n                        <button data-id=\"${s.id}\" class=\"del-stud\" style=\"color:#fb7185\">Delete<\/button>\n                      <\/div>`;
      sList.appendChild(li);
    });

    document.querySelectorAll('.del-stud').forEach(b => b.onclick = e => {
      const id = e.target.dataset.id;
      lsSet('attendease_students', lsGet('attendease_students', []).filter(x => x.id !== id));
      renderAdminManage();
    });

    // QR Generation - open popup with QR (admin)
    document.querySelectorAll('.gen-qr').forEach(b => b.onclick = e => {
      const id = e.target.dataset.id;
      const studsAll = lsGet('attendease_students', []);
      const s = studsAll.find(x => x.id === id);
      if (!s) return;

      const popup = window.open('', '_blank', 'width=420,height=520');
      popup.document.write(`\n        <html>\n          <head>\n            <title>QR for ${s.name}</title>\n            <script src=\"https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js\"></script>\n          </head>\n          <body style=\"background:#071022;color:#fff;font-family:Arial;padding:12px\">\n            <h3>${s.name}</h3>\n            <div id=\"qrc\"></div>\n            <div style=\"margin-top:8px\">Ref: <strong>${s.ref}</strong></div>\n            <div style=\"margin-top:8px\"><a id=\"dl\" href=\"${s.qr || ('https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl='+encodeURIComponent(s.ref))}\" download=\"${s.name}_qr.png\">Download QR</a></div>\n          </body>\n        </html>\n      `);
      popup.document.close();

      popup.onload = () => {
        try {
          const qrDiv = popup.document.getElementById('qrc');
          new popup.QRCode(qrDiv, { text: s.ref, width: 300, height: 300 });

          setTimeout(() => {
            const img = qrDiv.querySelector('img') || qrDiv.querySelector('canvas');
            if (img) {
              let dataUrl;
              if (img.tagName.toLowerCase() === 'canvas') {
                dataUrl = img.toDataURL('image/png');
              } else {
                dataUrl = img.src;
              }
              popup.document.getElementById('dl').href = dataUrl;
            }
          }, 500);
        } catch (err) {
          console.error(err);
          const qrUrl = 'https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=' + encodeURIComponent(s.ref);
          popup.document.getElementById('qrc').innerHTML = `<img src="${qrUrl}" alt="QR"/>`;
          popup.document.getElementById('dl').href = qrUrl;
        }
      };
    });

    // Assign teacher to class - avoid duplicates and use onclick
    const assignBtn = document.getElementById('assign_btn');
    if (assignBtn) {
      assignBtn.onclick = () => {
        const tSel = document.getElementById('assign_teacher');
        const clsSel = document.getElementById('assign_class');
        if (!tSel || !clsSel) return;
        const tId = tSel.value;
        const cls = clsSel.value;
        if (!tId || !cls) { alert('Select teacher and class'); return; }
        let assigns = lsGet('attendease_assigns', []);
        // Prevent duplicate assignment
        if (assigns.some(a => a.teacherId === tId && a.className === cls && a.schoolId === current.schoolId)) {
          alert('This teacher is already assigned to that class.');
          return;
        }
        assigns.push({ id: uid('as'), teacherId: tId, className: cls, schoolId: current.schoolId });
        lsSet('attendease_assigns', assigns);
        alert('Teacher assigned!');
        renderAdminManage();
      };
    }
  }

  // ======= TEACHER MANAGEMENT =======
  function renderTeacherManage() {
    // remove duplicates
    const assignList = myAssigns()
      .filter(a => a.teacherId === current.id)
      .filter((a, i, self) => i === self.findIndex(x => x.className === a.className));
    const container = document.getElementById('teacher_assign');
    if (container) container.innerHTML = assignList.length ? '<div class=\"font-semibold\">Your Classes:<\/div>' : 'You are not assigned any class yet.';
    assignList.forEach(a => {
      const div = document.createElement('div');
      div.className = 'mt-2 p-2 bg-white/3 rounded';
      div.innerHTML = `<div>${a.className}</div><div class=\"mt-2\"><button data-class=\"${a.className}\" class=\"open-class px-3 py-1 rounded\">Open<\/button><\/div>`;
      container.appendChild(div);
    });

    // Build list of students from assigned classes only
    const classes = assignList.map(a => a.className);
    const studs = myStudents().filter(s => classes.includes(s.class));
    const sList = document.getElementById('student_list');
    if (sList) {
      sList.innerHTML = '';
      studs.forEach(s => {
        const li = document.createElement('li');
        li.className = 'py-1 flex justify-between items-center';
        li.innerHTML = `<div>\n                          <div>${s.name} <small style=\"color:#94a3b8\">(${s.class})</small></div>\n                          <div style=\"color:#94a3b8; font-size:12px\">Roll: <strong>${s.roll || '-'} <\/strong> · Ref: <span style=\"font-family:monospace\">${s.ref}<\/span><\/div>\n                        <\/div>\n                        <div>\n                          <button data-id=\"${s.id}\" class=\"gen-qr text-sm px-2 py-1\" style=\"background:rgba(255,255,255,0.06);border-radius:6px\">Generate QR<\/button>\n                        <\/div>`;
        sList.appendChild(li);
      });
    }

    // ======= TEACHER ADD STUDENT =======
    const addBtn = document.getElementById('add_student_btn');
    if (addBtn) {
      // populate dropdowns with only teacher's assigned classes
      const classSel = document.getElementById('add_student_class');
      const rollSel = document.getElementById('add_student_roll');
      if (classSel) classSel.innerHTML = '';
      if (rollSel) rollSel.innerHTML = '';

      for (let r = 1; r <= 50; r++) {
        if (rollSel) {
          const ro = document.createElement('option');
          ro.value = r;
          ro.text = 'Roll ' + r;
          rollSel.appendChild(ro);
        }
      }

      assignList.forEach(a => {
        if (classSel) {
          const o = document.createElement('option');
          o.value = a.className;
          o.text = a.className;
          classSel.appendChild(o);
        }
      });

      addBtn.onclick = () => {
        const nameEl = document.getElementById('add_student_name');
        const clsEl = document.getElementById('add_student_class');
        const rollEl = document.getElementById('add_student_roll');
        if (!nameEl || !clsEl || !rollEl) return;

        const name = nameEl.value.trim();
        const cls = clsEl.value;
        const roll = rollEl.value;

        if (!name || !cls) {
          alert('Enter student name and class');
          return;
        }

        // ensure teacher is assigned to this class
        if (!assignList.find(a => a.className === cls)) {
          alert('You are not assigned to this class');
          return;
        }

        let studsAll = lsGet('attendease_students', []);
        // Prevent exact duplicates
        if (studsAll.some(s => s.name.toLowerCase() === name.toLowerCase() && s.class === cls && String(s.roll) === String(roll) && s.schoolId === current.schoolId)) {
          alert('A student with same name, class and roll already exists.');
          return;
        }
        if (studsAll.some(s => s.class === cls && String(s.roll) === String(roll) && s.schoolId === current.schoolId)) {
          if (!confirm(`Roll ${roll} already used in this class. Continue anyway?`)) return;
        }

        const ref = 'REF' + Math.random().toString(36).slice(2, 8).toUpperCase();
        const qrUrl = 'https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=' + encodeURIComponent(ref);

        studsAll.push({
          id: uid('s'),
          name,
          class: cls,
          roll: Number(roll),
          ref,
          schoolId: current.schoolId,
          qr: qrUrl
        });

        lsSet('attendease_students', studsAll);
        nameEl.value = '';

        alert('Student added!');
        renderTeacherManage(); // refresh student list
      };
    }

    // teacher QR popups
    document.querySelectorAll('.gen-qr').forEach(b => b.onclick = e => {
      const id = e.target.dataset.id;
      const s = myStudents().find(x => x.id === id);
      if (!s) return;
      const popup = window.open('', '_blank', 'width=420,height=520');
      popup.document.write(`<html><head><title>QR for ${s.name}</title><script src=\"https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js\"></script></head><body style=\"background:#071022;color:#fff;padding:12px\"><h3>${s.name}</h3><div id=\"qrc\"></div><div>Ref: ${s.ref}</div><div style=\"margin-top:8px\"><a id=\"dl\" href=\"${s.qr || ('https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl='+encodeURIComponent(s.ref))}\" download=\"${s.name}_qr.png\">Download QR</a></div></body></html>`);
      popup.document.close();
      popup.onload = () => {
        try {
          const qrDiv = popup.document.getElementById('qrc');
          new popup.QRCode(qrDiv, { text: s.ref, width: 300, height: 300 });

          setTimeout(() => {
            const img = qrDiv.querySelector('img') || qrDiv.querySelector('canvas');
            if (img) {
              let dataUrl;
              if (img.tagName.toLowerCase() === 'canvas') {
                dataUrl = img.toDataURL('image/png');
              } else {
                dataUrl = img.src;
              }
              popup.document.getElementById('dl').href = dataUrl;
            }
          }, 500);
        } catch (err) {
          console.error(err);
          const qrUrl = 'https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=' + encodeURIComponent(s.ref);
          popup.document.getElementById('qrc').innerHTML = `<img src="${qrUrl}" alt="QR"/>`;
          popup.document.getElementById('dl').href = qrUrl;
        }
      };
    });

    // Attendance slider panel (only once)
    if (!document.getElementById('attendance_panel')) {
      const panel = document.createElement('div');
      panel.id = 'attendance_panel';
      panel.className = 'mt-6 card p-4 glass';
      panel.innerHTML = `
        <h3 class=\"font-semibold\">Mark Attendance (by Reference ID)<\/h3>
        <div class=\"mt-2 flex gap-2\">\n          <input id=\"att_ref_input\" placeholder=\"Enter student Ref (e.g. REFXXXX)\" class=\"p-2 rounded bg-[#071022] border border-white/6 flex-1\"/>\n          <button id=\"att_load\" class=\"px-3 py-2 rounded bg-white/6\">Load<\/button>\n          <button id=\"att_scan\" class=\"px-3 py-2 rounded bg-white/6\">Scan QR<\/button>\n        <\/div>\n        <div id=\"scanner_area\" class=\"mt-2\"></div>\n        <div id=\"att_student_area\" class=\"mt-3\"></div>\n      `;
      viewManage.prepend(panel);

      let currentScanner = null; // will hold Html5QrcodeScanner or Html5Qrcode instance

      document.getElementById('att_load').onclick = () => {
        const ref = document.getElementById('att_ref_input').value.trim().toUpperCase();
        const s = myStudents().find(x => x.ref === ref);
        if (!s) { alert('Student not found'); return; }
        // ensure teacher can only mark attendance for their assigned students
        const assignList = myAssigns().filter(a => a.teacherId === current.id);
        if (current.role === 'teacher' && !assignList.find(a => a.className === s.class)) { alert('You are not assigned to this class'); return; }
        showAttendanceSliderForStudent(s);
      };

      document.getElementById('att_scan').onclick = async () => {
        const scannerArea = document.getElementById('scanner_area');
        scannerArea.innerHTML = `<div id=\"reader\" style=\"width:320px\"></div><div style=\"margin-top:8px\"><button id=\"stop_scan\" class=\"px-3 py-1 rounded bg-red-600\">Stop<\/button><\/div>`;

        // Prefer Html5QrcodeScanner (UI) but fallback to Html5Qrcode if needed.
        try {
          if (typeof Html5QrcodeScanner !== 'undefined') {
            currentScanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 250 }, false);
            currentScanner.render(
              (decodedText) => {
                document.getElementById('att_ref_input').value = decodedText.toUpperCase();
                // stop and clear UI
                currentScanner.clear().then(() => { 
                  scannerArea.innerHTML = ''; 
                  const s = myStudents().find(x => x.ref === decodedText.toUpperCase()); 
                  if (s) { 
                    const assignList = myAssigns().filter(a => a.teacherId === current.id);
                    if (current.role === 'teacher' && !assignList.find(a => a.className === s.class)) { 
                      alert('You are not assigned to this class'); 
                      return; 
                    } 
                    showAttendanceSliderForStudent(s); 
                  } else {
                    alert('Student not found');
                  }
                }).catch(()=>{ scannerArea.innerHTML=''; });
              }, 
              (errorMessage) => {
                // ignore per-frame scan errors
              }
            );
          } else if (typeof Html5Qrcode !== 'undefined') {
            // fallback: show camera selection and start scanning
            const html5Qrcode = new Html5Qrcode("reader");
            currentScanner = html5Qrcode;
            const cameras = await Html5Qrcode.getCameras().catch(()=>[]);
            const cameraId = (cameras && cameras[0] && cameras[0].id) || null;
            html5Qrcode.start(
              cameraId,
              { fps: 10, qrbox: 250 },
              (decodedText) => {
                document.getElementById('att_ref_input').value = decodedText.toUpperCase();
                html5Qrcode.stop().then(()=>{ scannerArea.innerHTML = ''; const s = myStudents().find(x => x.ref === decodedText.toUpperCase()); if (s) { const assignList = myAssigns().filter(a => a.teacherId === current.id); if (current.role === 'teacher' && !assignList.find(a => a.className === s.class)) { alert('You are not assigned to this class'); return; } showAttendanceSliderForStudent(s); } else { alert('Student not found'); } }).catch(()=>{ scannerArea.innerHTML=''; });
              },
              (err) => { /* ignore scan errors */ }
            ).catch(err => {
              alert('Unable to start camera. Please allow camera permissions or try a different browser.');
              scannerArea.innerHTML = '';
            });
          } else {
            alert('QR Scanner library not loaded. Please check your internet connection.');
            scannerArea.innerHTML = '';
            return;
          }
        } catch (err) {
          console.error(err);
          alert('Scanner error: ' + (err && err.message ? err.message : err));
          scannerArea.innerHTML = '';
        }

        document.getElementById('stop_scan').onclick = () => { 
          if (!currentScanner) { document.getElementById('scanner_area').innerHTML = ''; return; }
          if (typeof currentScanner.clear === 'function') {
            currentScanner.clear().then(()=> document.getElementById('scanner_area').innerHTML = '').catch(()=> document.getElementById('scanner_area').innerHTML = '');
          } else if (typeof currentScanner.stop === 'function') {
            currentScanner.stop().then(()=> document.getElementById('scanner_area').innerHTML = '').catch(()=> document.getElementById('scanner_area').innerHTML = '');
          } else {
            document.getElementById('scanner_area').innerHTML = '';
          }
        };
      };
    }
  }

  // ======= ATTENDANCE SLIDER =======
  function showAttendanceSliderForStudent(s) {
    const container = document.getElementById('att_student_area');
    container.innerHTML = `
      <div class=\"p-3 bg-white/3 rounded\">\n        <div><strong>${s.name}</strong> — <span style=\"color:#94a3b8\">${s.class}<\/span><\/div>\n        <div style=\"color:#94a3b8; margin-top:6px\">Roll: <strong>${s.roll || '-'}<\/strong> · Reference: <span style=\"font-family:monospace\">${s.ref}<\/span><\/div>\n        <div class=\"mt-3 flex items-center gap-3\">\n          <label class=\"text-sm\">Present<\/label>\n          <input id=\"att_slider\" type=\"range\" min=\"0\" max=\"1\" step=\"1\" value=\"1\" />\n          <button id=\"att_save\" class=\"px-3 py-1 bg-green-500 text-black rounded\">Save<\/button>\n        <\/div>\n      <\/div>\n    `;
    document.getElementById('att_save').onclick = () => {
      const val = document.getElementById('att_slider').value;
      const present = val === '1';
      const att = lsGet('attendease_attendance', []);
      att.push({ id: uid('att'), studentId: s.id, date: new Date().toISOString().slice(0, 10), present, schoolId: current.schoolId, recordedBy: current.id, roll: s.roll });
      lsSet('attendease_attendance', att);
      alert('Attendance recorded');
    };
  }

  // ======= INITIALIZE =======
  showView(current.role === 'admin' ? 'manage' : 'attendance');
  renderManage();

  // ======= REPORTS =======
  function renderReports() {
    const viewRep = document.getElementById('view_reports');
    if (!viewRep) return;

    // Get data
    const att = lsGet('attendease_attendance', []).filter(a => a.schoolId === current.schoolId);
    const students = myStudents();

    // Clear existing charts if any
    const pieCanvas = document.getElementById('pieChart');
    const barCanvas = document.getElementById('barChart');

    if (pieCanvas) pieCanvas.remove();
    if (barCanvas) barCanvas.remove();

    // Render HTML
    viewRep.innerHTML = `
      <h2 class="text-xl font-semibold mb-3">Attendance Reports</h2>

      <div class="w-full h-80 mb-6">
        <canvas id="pieChart"></canvas>
      </div>

      <div class="w-full h-96 mb-6">
        <canvas id="barChart"></canvas>
      </div>

      <div class="mt-4 flex gap-2">
        <button id="exportCsv" class="px-3 py-1 bg-blue-500 text-white rounded">Export CSV</button>
        <button id="exportPdf" class="px-3 py-1 bg-green-500 text-white rounded">Export PDF</button>
      </div>
    `;

    // Pie chart: Present vs Absent
    const presentCount = att.filter(a => a.present).length;
    const absentCount = att.length - presentCount;

    new Chart(document.getElementById('pieChart'), {
      type: 'pie',
      data: {
        labels: ['Present', 'Absent'],
        datasets: [{
          data: [presentCount, absentCount],
          backgroundColor: ['#4ade80', '#f87171']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

    // Bar chart: Attendance per student
    const studentNames = students.map(s => s.name);
    const studentPresent = students.map(s => att.filter(a => a.studentId === s.id && a.present).length);

    new Chart(document.getElementById('barChart'), {
      type: 'bar',
      data: {
        labels: studentNames,
        datasets: [{
          label: 'Days Present',
          data: studentPresent,
          backgroundColor: '#60a5fa'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    // CSV export
    document.getElementById('exportCsv').onclick = () => {
      let csv = 'Name,Class,Roll,Present Days\n';
      students.forEach(s => {
        const days = att.filter(a => a.studentId === s.id && a.present).length;
        csv += `${s.name},${s.class},${s.roll},${days}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'attendance_report.csv';
      a.click();
      URL.revokeObjectURL(url);
    };

    // PDF export (requires jsPDF)
    document.getElementById('exportPdf').onclick = () => {
      if (typeof jsPDF === 'undefined') {
        alert('PDF export library not loaded. Please check your internet connection.');
        return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.text('Attendance Report', 10, 10);
      let y = 20;
      students.forEach(s => {
        const days = att.filter(a => a.studentId === s.id && a.present).length;
        doc.text(`${s.name} | ${s.class} | Roll: ${s.roll} | Present: ${days}`, 10, y);
        y += 10;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
      doc.save('attendance_report.pdf');
    };
  }

  // ======= NOTIFICATIONS =======
  function renderNotifications() {
    const viewNot = document.getElementById('view_notifications');
    if (!viewNot) return;

    viewNot.innerHTML = `\n      <div class=\"p-4\">\n        <h2 class=\"text-xl font-semibold mb-3\">Notifications<\/h2>\n        \n        <div class=\"mb-4\">\n          <textarea id=\"not_message\" class=\"w-full p-2 rounded bg-[#071022] border border-white/10\" \n            placeholder=\"Write your message...\"><\/textarea>\n          <div class=\"mt-2 flex items-center gap-2\">\n            <select id=\"not_receiver\" class=\"p-2 rounded bg-[#071022] border border-white/10 flex-1\">\n              <option value=\"\">-- Select Receiver --<\/option>\n            <\/select>\n            <button id=\"not_send\" class=\"px-4 py-2 bg-green-500 text-black rounded\">Send<\/button>\n          <\/div>\n        <\/div>\n\n        <div class=\"grid grid-cols-2 gap-4\">\n          <div>\n            <h3 class=\"font-semibold mb-2\">Inbox<\/h3>\n            <ul id=\"not_inbox\" class=\"space-y-2\"><\/ul>\n          <\/div>\n          <div>\n            <h3 class=\"font-semibold mb-2\">Sent<\/h3>\n            <ul id=\"not_sent\" class=\"space-y-2\"><\/ul>\n          <\/div>\n        <\/div>\n      <\/div>\n    `;

    // ======= RECEIVER DROPDOWN =======
    const sel = document.getElementById('not_receiver');
    if (current.role === 'admin') {
      myUsers().filter(u => u.role === 'teacher').forEach(t => {
        const o = document.createElement('option');
        o.value = t.id;
        o.text = t.name;
        sel.appendChild(o);
      });
    } else if (current.role === 'teacher') {
      const admin = myUsers().find(u => u.role === 'admin');
      if (admin) {
        const o = document.createElement('option');
        o.value = admin.id;
        o.text = admin.name + " (Admin)";
        sel.appendChild(o);
      }
    }

    // ======= SEND BUTTON =======
    document.getElementById('not_send').onclick = () => {
      const msg = document.getElementById('not_message').value.trim();
      const rec = document.getElementById('not_receiver').value;
      if (!msg || !rec) { alert("Enter message and select receiver"); return; }

      let notes = lsGet('attendease_notifications', []);
      notes.push({
        id: uid("n"),
        fromId: current.id,
        toId: rec,
        message: msg,
        date: new Date().toLocaleString(),
        unread: true,   // mark as unread
        schoolId: current.schoolId
      });
      lsSet('attendease_notifications', notes);

      document.getElementById('not_message').value = '';
      renderNotifications();
      updateNotificationBadge();
    };

    // ======= INBOX =======
    let notes = myNotifications();
    const inbox = notes.filter(n => n.toId === current.id);
    const ulIn = document.getElementById('not_inbox');
    inbox.forEach(n => {
      const fromUser = myUsers().find(u => u.id === n.fromId);
      const li = document.createElement('li');
      li.className = "p-2 bg-white/5 rounded";
      li.innerHTML = `<div class=\"text-sm text-gray-300\">${n.message}</div>\n                      <div class=\"text-xs text-gray-500 mt-1\">From: ${fromUser?.name || 'Unknown'} · ${n.date}</div>`;
      ulIn.appendChild(li);
    });

    // mark inbox as read when opened
    notes = notes.map(n => {
      if (n.toId === current.id) n.unread = false;
      return n;
    });
    lsSet('attendease_notifications', notes);
    updateNotificationBadge();

    // ======= SENT =======
    const sent = myNotifications().filter(n => n.fromId === current.id);
    const ulSent = document.getElementById('not_sent');
    sent.forEach(n => {
      const toUser = myUsers().find(u => u.id === n.toId);
      const li = document.createElement('li');
      li.className = "p-2 bg-white/5 rounded";
      li.innerHTML = `<div class=\"text-sm text-gray-300\">${n.message}</div>\n                      <div class=\"text-xs text-gray-500 mt-1\">To: ${toUser?.name || 'Unknown'} · ${n.date}</div>`;
      ulSent.appendChild(li);
    });
  }

  // ======= NOTIFICATION BADGE =======
  function updateNotificationBadge() {
    const btn = document.getElementById('nav-not');
    if (!btn) return;
    let badge = btn.querySelector('.not-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = "not-badge absolute top-0 right-0 bg-red-600 text-xs px-1 rounded-full";
      btn.style.position = "relative";
      btn.appendChild(badge);
    }

    const unread = myNotifications().filter(n => n.toId === current.id && n.unread).length;
    if (unread > 0) {
      badge.textContent = unread;
      badge.style.display = "inline";
    } else {
      badge.style.display = "none";
    }
  }

  // run badge updater every 5s
  setInterval(updateNotificationBadge, 5000);
  updateNotificationBadge();

  // ======= SETTINGS =======
  function renderSettings() {
    const deleteBtn = document.getElementById('delete_account');
    if (current.role === 'admin' && deleteBtn) {
      deleteBtn.style.display = 'inline-block';
      deleteBtn.onclick = () => {
        if (confirm('Delete school and all data?')) {
          localStorage.clear();
          window.location.href = 'landing.html';
        }
      };
    } else if (deleteBtn) {
      deleteBtn.style.display = 'none';
    }
  }

  // ======= INIT =======
  showView(current.role === 'admin' ? 'manage' : 'attendance');
  renderManage();
});