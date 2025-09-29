import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { executeQuery, executeQueryOne } from './database'

// Função para obter JWT_SECRET com validação
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET deve ser definido e ter pelo menos 32 caracteres')
  }
  return secret
}

// Configurações de segurança JWT
const JWT_CONFIG = {
  expiresIn: process.env.JWT_EXPIRES_IN || '1h', // Token expira em 1 hora
  issuer: 'dashboard-inteli',
  audience: 'dashboard-users'
}

export interface User {
  id: number
  username: string
  email: string
  name?: string
  role: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResult {
  success: boolean
  user?: User
  token?: string
  message?: string
}

// Hash de senha
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

// Verificar senha
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Gerar token JWT
export function generateToken(user: User): string {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    iat: Math.floor(Date.now() / 1000), // issued at
    jti: `token_${user.id}_${Date.now()}` // JWT ID único
  }

  return jwt.sign(payload, getJWTSecret() as jwt.Secret)
}

// Gerar refresh token
export function generateRefreshToken(user: User): string {
  const payload = {
    id: user.id,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    jti: `refresh_${user.id}_${Date.now()}`
  }

  return jwt.sign(payload, getJWTSecret() as jwt.Secret)
}

// Verificar token JWT
export function verifyToken(token: string): any {
  try {
    const decoded = jwt.verify(token, getJWTSecret() as jwt.Secret) as any

    // Verificações adicionais de segurança
    if (!decoded.id || !decoded.username || !decoded.role) {
      return null
    }

    return decoded
  } catch (error) {
    console.error('Erro na verificação do token:', error)
    return null
  }
}

// Buscar usuário por username
export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const user = await executeQueryOne<User>(
      'SELECT * FROM users WHERE username = ? AND isActive = 1',
      [username]
    )
    return user
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return null
  }
}

// Buscar usuário por ID
export async function getUserById(id: number): Promise<User | null> {
  try {
    const user = await executeQueryOne<User>(
      'SELECT id, username, email, name, role, isActive, createdAt, updatedAt FROM users WHERE id = ? AND isActive = 1',
      [id]
    )
    return user
  } catch (error) {
    console.error('Erro ao buscar usuário por ID:', error)
    return null
  }
}

// Criar usuário
export async function createUser(userData: {
  username: string
  email: string
  password: string
  name?: string
  role?: string
}): Promise<User | null> {
  try {
    const hashedPassword = await hashPassword(userData.password)
    
    const result = await executeQuery(
      `INSERT INTO users (username, email, password, name, role, isActive, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        userData.username,
        userData.email,
        hashedPassword,
        userData.name || null,
        userData.role || 'user'
      ]
    ) as any

    if (result.insertId) {
      return await getUserById(result.insertId)
    }
    return null
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return null
  }
}

// Login
export async function login(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    // Buscar usuário
    const user = await executeQueryOne<{ id: number, username: string, email: string, password: string, name: string, role: string, isActive: boolean, createdAt: Date, updatedAt: Date }>(
      'SELECT * FROM users WHERE username = ? AND isActive = 1',
      [credentials.username]
    )

    if (!user) {
      return {
        success: false,
        message: 'Usuário não encontrado ou inativo'
      }
    }

    // Verificar senha
    const isValidPassword = await verifyPassword(credentials.password, user.password)
    
    if (!isValidPassword) {
      return {
        success: false,
        message: 'Senha incorreta'
      }
    }

    // Gerar token
    const token = generateToken(user)

    // Retornar usuário sem a senha
    const { password, ...userWithoutPassword } = user

    return {
      success: true,
      user: userWithoutPassword,
      token
    }
  } catch (error) {
    console.error('Erro no login:', error)
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}

// Criar usuário admin padrão
export async function createDefaultAdmin(): Promise<void> {
  try {
    // Verificar se já existe um admin
    const existingAdmin = await getUserByUsername('admin')
    
    if (existingAdmin) {
      console.log('✅ Usuário admin já existe')
      return
    }

    // Criar admin padrão
    const admin = await createUser({
      username: 'admin',
      email: 'admin@dashboard.com',
      password: 'admin@1234',
      name: 'Administrador',
      role: 'admin'
    })

    if (admin) {
      console.log('✅ Usuário admin criado com sucesso!')
      console.log('👤 Username: admin')
      console.log('🔑 Senha: admin@1234')
    } else {
      console.log('❌ Erro ao criar usuário admin')
    }
  } catch (error) {
    console.error('❌ Erro ao criar admin padrão:', error)
  }
}
