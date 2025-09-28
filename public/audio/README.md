# 🎵 Arquivos de Áudio

## 📁 **Como Adicionar Seus Arquivos MP3:**

### 1. **Coloque seus arquivos MP3 nesta pasta:**
```
public/audio/
├── bell.mp3          # Som de sininho
├── success.mp3       # Som de sucesso
├── celebration.mp3   # Som de celebração
└── fireworks.mp3     # Som de fogos de artifício
```

### 2. **Formatos Suportados:**
- ✅ **MP3** (recomendado)
- ✅ **WAV**
- ✅ **OGG**
- ✅ **M4A**

### 3. **Tamanho Recomendado:**
- **Duração:** 1-3 segundos
- **Tamanho:** < 100KB
- **Qualidade:** 128kbps ou menor

## 🎯 **Arquivos Sugeridos:**

### **bell.mp3** - Som de Sininho
- Sininho suave e agradável
- Duração: 1-2 segundos
- Volume: Médio

### **success.mp3** - Som de Sucesso
- Som de "ding" ou "chime"
- Duração: 0.5-1 segundo
- Volume: Médio

### **celebration.mp3** - Som de Celebração
- Som de fogos ou aplausos
- Duração: 2-3 segundos
- Volume: Alto

## 🔧 **Como Usar:**

1. **Baixe ou grave** seus arquivos MP3
2. **Coloque na pasta** `public/audio/`
3. **Renomeie** conforme os nomes sugeridos
4. **Teste** usando os botões na página

## 📝 **Exemplo de Uso:**

```typescript
const { playBellSound } = useAudioPlayer()

// Toca o sininho
playBellSound()
```

## 🎵 **Sites para Baixar Sons:**

- **Freesound.org** (gratuito)
- **Zapsplat.com** (gratuito com cadastro)
- **Adobe Audition** (para criar seus próprios)
- **Audacity** (gratuito para editar)
