// PayLater App - Main JavaScript

// State Management
let currentUser = null;
let editingDebtId = null;

// Utility Functions
const hashPassword = (password) => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
};

const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID').format(number);
};

const showPage = (pageId) => {
    ['loginPage', 'registerPage', 'dashboardPage', 'debtFormPage', 'profilePage'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');
};

const clearErrors = () => {
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
};

const showError = (inputId, message) => {
    const input = document.getElementById(inputId);
    input.classList.add('is-invalid');
    input.nextElementSibling.textContent = message;
};

// LocalStorage Functions
const getUsers = () => JSON.parse(localStorage.getItem('paylater_users') || '[]');
const saveUsers = (users) => localStorage.setItem('paylater_users', JSON.stringify(users));

const getDebts = () => JSON.parse(localStorage.getItem('paylater_debts') || '[]');
const saveDebts = (debts) => localStorage.setItem('paylater_debts', JSON.stringify(debts));

const getSession = () => JSON.parse(localStorage.getItem('paylater_session') || 'null');
const saveSession = (user, remember) => {
    if (remember) {
        localStorage.setItem('paylater_session', JSON.stringify({ email: user.email }));
    }
};
const clearSession = () => localStorage.removeItem('paylater_session');

// Auth Functions
const handleRegister = () => {
    clearErrors();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    
    let hasError = false;
    
    if (!name) {
        showError('registerName', 'Nama harus diisi');
        hasError = true;
    }
    
    if (!validateEmail(email)) {
        showError('registerEmail', 'Email tidak valid');
        hasError = true;
    }
    
    if (password.length < 6) {
        showError('registerPassword', 'Password minimal 6 karakter');
        hasError = true;
    }
    
    const users = getUsers();
    if (users.find(u => u.email === email)) {
        showError('registerEmail', 'Email sudah terdaftar');
        hasError = true;
    }
    
    if (hasError) return;
    
    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password: hashPassword(password)
    };
    
    users.push(newUser);
    saveUsers(users);
    
    document.getElementById('registerName').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPassword').value = '';
    
    alert('Registrasi berhasil! Silakan login.');
    showPage('loginPage');
};

const handleLogin = () => {
    clearErrors();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('rememberMe').checked;
    
    let hasError = false;
    
    if (!validateEmail(email)) {
        showError('loginEmail', 'Email tidak valid');
        hasError = true;
    }
    
    if (!password) {
        showError('loginPassword', 'Password harus diisi');
        hasError = true;
    }
    
    if (hasError) return;
    
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === hashPassword(password));
    
    if (user) {
        currentUser = user;
        saveSession(user, remember);
        
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        
        loadDashboard();
        showPage('dashboardPage');
    } else {
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = 'Email atau password salah';
        errorDiv.classList.remove('hidden');
    }
};

const handleLogout = () => {
    currentUser = null;
    clearSession();
    showPage('loginPage');
};

// Profile Functions
const loadProfile = () => {
    document.getElementById('profileName').value = currentUser.name;
    document.getElementById('profileEmail').value = currentUser.email;
    showPage('profilePage');
};

const handleUpdateProfile = () => {
    clearErrors();
    
    const name = document.getElementById('profileName').value.trim();
    const email = document.getElementById('profileEmail').value.trim();
    
    let hasError = false;
    
    if (!name) {
        showError('profileName', 'Nama harus diisi');
        hasError = true;
    }
    
    if (!validateEmail(email)) {
        showError('profileEmail', 'Email tidak valid');
        hasError = true;
    }
    
    if (hasError) return;
    
    const users = getUsers();
    const updatedUsers = users.map(u => 
        u.id === currentUser.id ? { ...u, name, email } : u
    );
    
    saveUsers(updatedUsers);
    currentUser = { ...currentUser, name, email };
    
    alert('Profile berhasil diupdate!');
    showPage('dashboardPage');
};

// Dashboard Functions
const loadDashboard = () => {
    const debts = getDebts().filter(d => d.userId === currentUser.id);
    
    const unpaidDebts = debts.filter(d => d.status === 'unpaid');
    const paidDebts = debts.filter(d => d.status === 'paid');
    
    const totalDebt = unpaidDebts.reduce((sum, d) => sum + d.amount, 0);
    const paidDebt = paidDebts.reduce((sum, d) => sum + d.amount, 0);
    
    document.getElementById('totalDebt').textContent = `Rp ${formatRupiah(totalDebt)}`;
    document.getElementById('unpaidCount').textContent = `${unpaidDebts.length} hutang belum lunas`;
    
    document.getElementById('paidDebt').textContent = `Rp ${formatRupiah(paidDebt)}`;
    document.getElementById('paidCount').textContent = `${paidDebts.length} hutang lunas`;
    
    document.getElementById('totalCount').textContent = debts.length;
    
    renderDebtList(debts);
};

const renderDebtList = (debts) => {
    const listContainer = document.getElementById('debtList');
    
    if (debts.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fas fa-inbox fa-3x mb-3"></i>
                <p>Belum ada catatan hutang</p>
            </div>
        `;
        return;
    }
    
    const sortedDebts = debts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    listContainer.innerHTML = `
        <div class="list-group">
            ${sortedDebts.map(debt => `
                <div class="list-group-item debt-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="mb-1 fw-bold">${debt.creditorName}</h6>
                            <p class="mb-1 text-muted small">${debt.description || '-'}</p>
                            <div class="d-flex gap-3 mt-2">
                                <span class="badge bg-secondary">
                                    <i class="fas fa-money-bill-wave me-1"></i>Rp ${formatRupiah(debt.amount)}
                                </span>
                                <span class="badge bg-info">
                                    <i class="fas fa-calendar me-1"></i>${new Date(debt.dueDate).toLocaleDateString('id-ID')}
                                </span>
                                ${debt.status === 'paid' 
                                    ? '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Lunas</span>'
                                    : '<span class="badge bg-danger"><i class="fas fa-exclamation-circle me-1"></i>Belum Lunas</span>'
                                }
                            </div>
                        </div>
                        <div class="btn-group-vertical btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="startEditDebt('${debt.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteDebt('${debt.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
};

// Debt CRUD Functions
const showAddDebtForm = () => {
    editingDebtId = null;
    document.getElementById('debtFormTitle').textContent = 'Tambah Hutang';
    document.getElementById('creditorName').value = '';
    document.getElementById('debtAmount').value = '';
    document.getElementById('debtDescription').value = '';
    document.getElementById('dueDate').value = '';
    document.getElementById('debtStatus').value = 'unpaid';
    clearErrors();
    showPage('debtFormPage');
};

const startEditDebt = (debtId) => {
    const debts = getDebts();
    const debt = debts.find(d => d.id === debtId);
    
    if (!debt) return;
    
    editingDebtId = debtId;
    document.getElementById('debtFormTitle').textContent = 'Edit Hutang';
    document.getElementById('creditorName').value = debt.creditorName;
    document.getElementById('debtAmount').value = debt.amount;
    document.getElementById('debtDescription').value = debt.description;
    document.getElementById('dueDate').value = debt.dueDate;
    document.getElementById('debtStatus').value = debt.status;
    clearErrors();
    showPage('debtFormPage');
};

const handleSaveDebt = () => {
    clearErrors();
    
    const creditorName = document.getElementById('creditorName').value.trim();
    const amount = parseFloat(document.getElementById('debtAmount').value);
    const description = document.getElementById('debtDescription').value.trim();
    const dueDate = document.getElementById('dueDate').value;
    const status = document.getElementById('debtStatus').value;
    
    let hasError = false;
    
    if (!creditorName) {
        showError('creditorName', 'Nama kreditor harus diisi');
        hasError = true;
    }
    
    if (!amount || amount <= 0) {
        showError('debtAmount', 'Jumlah harus lebih dari 0');
        hasError = true;
    }
    
    if (!dueDate) {
        showError('dueDate', 'Tanggal jatuh tempo harus diisi');
        hasError = true;
    }
    
    if (hasError) return;
    
    const debts = getDebts();
    
    if (editingDebtId) {
        // Update
        const updatedDebts = debts.map(d => 
            d.id === editingDebtId 
                ? { ...d, creditorName, amount, description, dueDate, status }
                : d
        );
        saveDebts(updatedDebts);
    } else {
        // Create
        const newDebt = {
            id: Date.now().toString(),
            userId: currentUser.id,
            creditorName,
            amount,
            description,
            dueDate,
            status,
            createdAt: new Date().toISOString()
        };
        debts.push(newDebt);
        saveDebts(debts);
    }
    
    loadDashboard();
    showPage('dashboardPage');
};

const deleteDebt = (debtId) => {
    if (!confirm('Yakin ingin menghapus hutang ini?')) return;
    
    const debts = getDebts();
    const filteredDebts = debts.filter(d => d.id !== debtId);
    saveDebts(filteredDebts);
    
    loadDashboard();
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Toggle Password
    document.getElementById('toggleLoginPassword').addEventListener('click', () => {
        const input = document.getElementById('loginPassword');
        const icon = document.querySelector('#toggleLoginPassword i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
    
    document.getElementById('toggleRegisterPassword').addEventListener('click', () => {
        const input = document.getElementById('registerPassword');
        const icon = document.querySelector('#toggleRegisterPassword i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
    
    // Navigation
    document.getElementById('goToRegister').addEventListener('click', () => showPage('registerPage'));
    document.getElementById('goToLogin').addEventListener('click', () => showPage('loginPage'));
    document.getElementById('goToProfile').addEventListener('click', loadProfile);
    document.getElementById('goToAddDebt').addEventListener('click', showAddDebtForm);
    document.getElementById('backToDashboard').addEventListener('click', () => {
        loadDashboard();
        showPage('dashboardPage');
    });
    document.getElementById('backToDashboardFromProfile').addEventListener('click', () => showPage('dashboardPage'));
    
    // Actions
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('registerBtn').addEventListener('click', handleRegister);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('updateProfileBtn').addEventListener('click', handleUpdateProfile);
    document.getElementById('saveDebtBtn').addEventListener('click', handleSaveDebt);
    
    // Enter key support
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('registerPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
    
    // Auto login
    const session = getSession();
    if (session) {
        const users = getUsers();
        const user = users.find(u => u.email === session.email);
        if (user) {
            currentUser = user;
            loadDashboard();
            showPage('dashboardPage');
        }
    }
});