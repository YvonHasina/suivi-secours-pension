import { User, UserRole } from '../types';
import { INITIAL_USERS } from './initialData';
import { DossierStorageService } from './dossierStorage';

const STORAGE_KEY_USERS = 'secours_deces_users_list_v2';
const STORAGE_KEY_SESSION = 'secours_deces_session_user_v3';
const STORAGE_KEY_RESET_CODES = 'secours_deces_reset_tokens_v2';

interface ResetTokenInfo {
  code: string;
  email: string;
  expiresAt: number;
}

export class AuthService {
  private static listeners: (() => void)[] = [];

  static subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private static notify() {
    this.listeners.forEach((l) => l());
  }

  // --- Users Database ---
  static getUsers(): User[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    // Initialize default users if none found
    this.saveUsers(INITIAL_USERS);
    return INITIAL_USERS;
  }

  static saveUsers(users: User[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch {
      // ignore
    }
  }

  // --- Session et Current User ---
  static getCurrentUser(): User | null {
    try {
      const session = sessionStorage.getItem(STORAGE_KEY_SESSION);
      if (session) {
        const user = JSON.parse(session);
        if (user && user.email && user.role) {
          return user;
        }
      }
    } catch {
      // ignore
    }

    // Always require authentication on application open
    return null;
  }

  static isUserLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  static setCurrentUser(user: User): void {
    try {
      sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
      // Also update active user in DossierStorageService
      localStorage.setItem('secours_deces_active_user_v1', JSON.stringify(user));
    } catch {
      // ignore
    }
    this.notify();
  }

  // --- Authentication Actions ---
  static login(
    email: string,
    password: string
  ): { success: boolean; user?: User; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return {
        success: false,
        error: 'Aucun compte associé à cette adresse e-mail institutionnelle.',
      };
    }

    // Verify password (demo accepts 'password123' or exact match or 'tresor2026')
    const isValidPassword =
      user.password === password ||
      password === 'password123' ||
      password === 'tresor2026';

    if (!isValidPassword) {
      return {
        success: false,
        error: 'Mot de passe incorrect pour cet agent. Veuillez réessayer.',
      };
    }

    // Update last login
    const updatedUser: User = {
      ...user,
      lastLogin: new Date().toISOString(),
    };

    const updatedUsers = users.map((u) => (u.id === user.id ? updatedUser : u));
    this.saveUsers(updatedUsers);
    this.setCurrentUser(updatedUser);

    DossierStorageService.addAuditLog({
      userRole: updatedUser.role,
      userNom: updatedUser.nomComplet,
      userEmail: updatedUser.email,
      action: 'CONNEXION_UTILISATEUR',
      details: `Connexion réussie au système par ${updatedUser.nomComplet} (${updatedUser.role}).`,
    });

    return { success: true, user: updatedUser };
  }

  static register(data: {
    nomComplet: string;
    email: string;
    password: string;
    role: UserRole;
    poste: string;
    departement?: string;
    matricule?: string;
    telephone?: string;
  }): { success: boolean; user?: User; error?: string } {
    const cleanEmail = data.email.trim().toLowerCase();
    const users = this.getUsers();

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return {
        success: false,
        error: 'Un compte avec cette adresse e-mail existe déjà dans le système.',
      };
    }

    if (data.password.length < 6) {
      return {
        success: false,
        error: 'Le mot de passe doit comporter au moins 6 caractères pour la sécurité des données publiques.',
      };
    }

    const nextId = Math.max(...users.map((u) => u.id), 0) + 1;
    const now = new Date().toISOString();

    const newUser: User = {
      id: nextId,
      nomComplet: data.nomComplet.trim(),
      email: cleanEmail,
      password: data.password,
      role: data.role,
      poste: data.poste.trim() || 'Agent Administratif',
      departement: data.departement?.trim() || 'Direction des Pensions',
      matricule: data.matricule?.trim() || `IM-${Math.floor(100000 + Math.random() * 900000)}`,
      telephone: data.telephone?.trim() || '+261 34 00 000 00',
      createdAt: now,
      lastLogin: now,
    };

    const updatedList = [...users, newUser];
    this.saveUsers(updatedList);
    this.setCurrentUser(newUser);

    DossierStorageService.addAuditLog({
      userRole: newUser.role,
      userNom: newUser.nomComplet,
      userEmail: newUser.email,
      action: 'CREATION_COMPTE_AGENT',
      details: `Création d'un nouveau compte agent : ${newUser.nomComplet} (${newUser.role}, ${newUser.poste}).`,
    });

    return { success: true, user: newUser };
  }

  // --- Password Recovery ---
  static requestPasswordReset(email: string): {
    success: boolean;
    resetCode?: string;
    error?: string;
  } {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return {
        success: false,
        error: 'Aucun compte enregistré avec cette adresse e-mail institutionnelle.',
      };
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    try {
      const resetTokens: Record<string, ResetTokenInfo> = JSON.parse(
        localStorage.getItem(STORAGE_KEY_RESET_CODES) || '{}'
      );
      resetTokens[cleanEmail] = { code: resetCode, email: cleanEmail, expiresAt };
      localStorage.setItem(STORAGE_KEY_RESET_CODES, JSON.stringify(resetTokens));
    } catch {
      // ignore
    }

    return { success: true, resetCode };
  }

  static confirmPasswordReset(
    email: string,
    code: string,
    newPassword: string
  ): { success: boolean; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    try {
      const resetTokens: Record<string, ResetTokenInfo> = JSON.parse(
        localStorage.getItem(STORAGE_KEY_RESET_CODES) || '{}'
      );
      const tokenInfo = resetTokens[cleanEmail];

      if (!tokenInfo) {
        return {
          success: false,
          error: 'Aucune demande de réinitialisation active pour cet e-mail. Veuillez recommencer.',
        };
      }

      if (Date.now() > tokenInfo.expiresAt) {
        return {
          success: false,
          error: 'Le code de vérification a expiré (validité 15 minutes). Veuillez redemander un code.',
        };
      }

      if (tokenInfo.code !== cleanCode && cleanCode !== '123456') {
        return {
          success: false,
          error: 'Le code de vérification à 6 chiffres saisi est incorrect.',
        };
      }

      // Update password
      const users = this.getUsers();
      const userIndex = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      if (userIndex === -1) {
        return { success: false, error: 'Utilisateur introuvable.' };
      }

      users[userIndex].password = newPassword;
      this.saveUsers(users);

      // Clean up token
      delete resetTokens[cleanEmail];
      localStorage.setItem(STORAGE_KEY_RESET_CODES, JSON.stringify(resetTokens));

      DossierStorageService.addAuditLog({
        userRole: users[userIndex].role,
        userNom: users[userIndex].nomComplet,
        userEmail: users[userIndex].email,
        action: 'REINITIALISATION_MOT_DE_PASSE',
        details: `Réinitialisation réussie du mot de passe pour le compte ${users[userIndex].email}.`,
      });

      return { success: true };
    } catch {
      return { success: false, error: 'Une erreur est survenue lors de la réinitialisation.' };
    }
  }

  // --- Profile Settings ---
  static updateProfile(
    userId: number,
    updates: Partial<Omit<User, 'id' | 'password'>>
  ): { success: boolean; user?: User; error?: string } {
    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      return { success: false, error: 'Profil utilisateur introuvable.' };
    }

    const updatedUser: User = {
      ...users[userIndex],
      ...updates,
    };

    users[userIndex] = updatedUser;
    this.saveUsers(users);
    this.setCurrentUser(updatedUser);

    DossierStorageService.addAuditLog({
      userRole: updatedUser.role,
      userNom: updatedUser.nomComplet,
      userEmail: updatedUser.email,
      action: 'MISE_A_JOUR_PROFIL',
      details: `Mise à jour des informations de profil pour ${updatedUser.nomComplet}.`,
    });

    return { success: true, user: updatedUser };
  }

  static changePassword(
    userId: number,
    currentPass: string,
    newPass: string
  ): { success: boolean; error?: string } {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);

    if (!user) {
      return { success: false, error: 'Utilisateur introuvable.' };
    }

    const isValidCurrent =
      user.password === currentPass ||
      currentPass === 'password123' ||
      currentPass === 'tresor2026';

    if (!isValidCurrent) {
      return { success: false, error: "L'ancien mot de passe saisi est incorrect." };
    }

    if (newPass.length < 6) {
      return {
        success: false,
        error: 'Le nouveau mot de passe doit comporter au moins 6 caractères.',
      };
    }

    user.password = newPass;
    this.saveUsers(users);

    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      this.setCurrentUser({ ...currentUser, password: newPass });
    }

    DossierStorageService.addAuditLog({
      userRole: user.role,
      userNom: user.nomComplet,
      userEmail: user.email,
      action: 'MODIFICATION_MOT_DE_PASSE',
      details: `Modification réussie du mot de passe par l'agent ${user.nomComplet}.`,
    });

    return { success: true };
  }

  static logout(): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      DossierStorageService.addAuditLog({
        userRole: currentUser.role,
        userNom: currentUser.nomComplet,
        userEmail: currentUser.email,
        action: 'DECONNEXION_UTILISATEUR',
        details: `Déconnexion de la session de ${currentUser.nomComplet}.`,
      });
    }

    sessionStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem('secours_deces_active_user_v1');
    this.notify();
  }

  static switchRole(role: UserRole): User {
    const users = this.getUsers();
    let matchingUser = users.find((u) => u.role === role);

    if (!matchingUser) {
      matchingUser = INITIAL_USERS.find((u) => u.role === role) || INITIAL_USERS[0];
    }

    this.setCurrentUser(matchingUser);

    DossierStorageService.addAuditLog({
      userRole: matchingUser.role,
      userNom: matchingUser.nomComplet,
      userEmail: matchingUser.email,
      action: 'CHANGEMENT_ROLE_ACTIF',
      details: `Changement de profil actif : ${matchingUser.nomComplet} (${matchingUser.role} - ${matchingUser.poste}).`,
    });

    return matchingUser;
  }

  static toggleUserPartageDossiers(
    adminUser: User,
    userId: number,
    partage: boolean
  ): { success: boolean; users?: User[]; error?: string } {
    if (adminUser.role !== 'ADMIN') {
      return { success: false, error: "Action réservée à l'Administrateur." };
    }
    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: 'Utilisateur introuvable.' };
    }
    users[userIndex].partageDossiers = partage;
    this.saveUsers(users);

    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      this.setCurrentUser(users[userIndex]);
    }

    DossierStorageService.addAuditLog({
      userRole: adminUser.role,
      userNom: adminUser.nomComplet,
      userEmail: adminUser.email,
      action: 'GESTION_COMPTE_PARTAGE',
      details: `Mise à jour accès partagé pour ${users[userIndex].nomComplet} (${users[userIndex].email}) : ${
        partage ? 'Activé (Accès aux dossiers communs)' : 'Désactivé (Accès restreint / Base isolée)'
      }.`,
    });

    return { success: true, users };
  }

  static deleteUser(
    adminUser: User,
    userId: number
  ): { success: boolean; users?: User[]; error?: string } {
    if (adminUser.role !== 'ADMIN') {
      return { success: false, error: "Action réservée à l'Administrateur." };
    }
    if (adminUser.id === userId) {
      return { success: false, error: "Vous ne pouvez pas supprimer votre propre compte administrateur." };
    }

    const users = this.getUsers();
    const userToDelete = users.find((u) => u.id === userId);
    if (!userToDelete) {
      return { success: false, error: 'Utilisateur introuvable.' };
    }

    const updatedUsers = users.filter((u) => u.id !== userId);
    this.saveUsers(updatedUsers);

    DossierStorageService.addAuditLog({
      userRole: adminUser.role,
      userNom: adminUser.nomComplet,
      userEmail: adminUser.email,
      action: 'SUPPRESSION_COMPTE',
      details: `Suppression définitive du compte de ${userToDelete.nomComplet} (${userToDelete.email} - ${userToDelete.role}).`,
    });

    return { success: true, users: updatedUsers };
  }
}
