import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'

const PORT = process.env.PORT ?? 3008

// 1. FLUJO DE REGISTRO (Base)
const registerFlow = addKeyword(utils.setEvent('REGISTER_FLOW'))
    .addAnswer(`What is your name?`, { capture: true }, async (ctx, { state }) => {
        await state.update({ name: ctx.body })
    })
    .addAnswer('What is your age?', { capture: true }, async (ctx, { state }) => {
        await state.update({ age: ctx.body })
    })
    .addAction(async (_, { flowDynamic, state }) => {
        const name = state.get('name') ?? 'User'
        const age = state.get('age') ?? 'unknown'
        await flowDynamic(`${name}, thanks for your information!: Your age: ${age}`)
    })


const fullSamplesFlow = addKeyword('doc').addAnswer(['samples', utils.setEvent('SAMPLES')])
    .addAnswer(`💪 I'll send you a lot files...`)
    .addAnswer(`Send image from Local`, { media: join(process.cwd(), 'assets', 'sample.png') })
    .addAnswer(`Send video from URL`, {
        media: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTJ0ZGdjd2syeXAwMjQ4aWdkcW04OWlqcXI3Ynh1ODkwZ25zZWZ1dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LCohAb657pSdHv0Q5h/giphy.mp4',
    })
    .addAnswer(`Send audio from URL`, { media: 'https://cdn.freesound.org/previews/728/728142_11861866-lq.mp3' })
    .addAnswer(`Send file from URL`, {
        media: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    })

// 2. FLUJO DE DOCUMENTACIÓN
const discordFlow = addKeyword('documentation_flow') // Keyword interno
    .addAnswer(
        ['You can see the documentation here', '📄 https://builderbot.app/docs \n', 'Do you want to continue? *yes*'],
        { capture: true },
        async (ctx, { gotoFlow, flowDynamic }) => {
            if (ctx.body.toLowerCase().includes('yes')) {
                return gotoFlow(registerFlow)
            }
            await flowDynamic('Thanks!')
        }
    )
// 3. FLUJO DE BIENVENIDA (Versión Corregida y Estable)
const welcomeFlow = addKeyword(['#'])
    .addAnswer(`❤️ Di lo que quieras y cuando quieras con flores ❤️ *Floristeria los lirios*`)
    .addAnswer(
        [
            '✨ *Catálogo en línea:*',
            '🌐 https://floristerialoslirios.com.co',
            '',
            'Para agilizar tu pedido, envíanos:',
            '✅ *Referencia:* (para validar disponibilidad)',
            '⏰ *Fecha y hora de entrega:*',
            '📍 *Dirección exacta:* (para validar el domicilio)',
            '',
            '¡Quedo pendiente! ✨',
        ].join('\n'),
        { delay: 800, capture: true },
        async (ctx, { fallBack }) => {
            const userInput = ctx.body.toLowerCase();

            
        }
    )

const main = async () => {
   const adapterFlow = createFlow([welcomeFlow, registerFlow, discordFlow, fullSamplesFlow])
    
    // If you experience ERRO AUTH issues, check the latest WhatsApp version at:
    // https://wppconnect.io/whatsapp-versions/
    // Example: version "2.3000.1035824857-alpha" -> [2, 3000, 1035824857]
   // --- CORRECCIÓN AQUÍ ---
const adapterProvider = createProvider(Provider, { 
    version: [2, 3000, 1035824857], // <-- No olvides esta coma
    savePath: '/data'              // <-- Ahora sí está bien vinculado al volumen de Fly
})
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })
 // --- AGREGA ESTE "RASTREADOR" JUSTO AQUÍ ---
    adapterProvider.server.use((req, res, next) => {
        console.log(`[TÚNEL NGROK]: ${req.method} ${req.url}`);
        next();
    });

  /**
     * ENVIAR MENSAJE SIMPLE O CON MEDIA
     */
   // 5. MENSAJES (POST)
    adapterProvider.server.post('/v1/messages', handleCtx(async (bot, req, res) => {
        const { number, message } = req.body
        if (number && message) await bot.sendMessage(number, message, {})
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok' }))
    }))
    /**
     * DISPARAR FLUJO DE REGISTRO
     */
    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            if (!number) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ status: 'error', message: 'Falta numero' }))
            }
            await bot.dispatch('REGISTER_FLOW', { from: number, name: name ?? 'Usuario' })
            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', message: 'Flujo de registro iniciado' }))
        })
    )

    /**
     * DISPARAR FLUJO DE MUESTRAS (SAMPLES)
     */
    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number } = req.body
            if (!number) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ status: 'error', message: 'Falta numero' }))
            }
            await bot.dispatch('SAMPLES', { from: number })
            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', message: 'Flujo de muestras iniciado' }))
        })
    )

    /**
     * AGREGAR O QUITAR DE BLACKLIST (LISTA NEGRA)
     */
    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (!number || !intent) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ status: 'error', message: 'Falta numero o intent (add/remove)' }))
            }

            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    /**
     * VER LISTA DE BLACKLIST
     */
    adapterProvider.server.get(
        '/v1/blacklist/list',
        handleCtx(async (bot, req, res) => {
            const blacklist = bot.blacklist.getList()
            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', blacklist }))
        })
    )

// 2. LOGOUT (CORREGIDO PARA NO CRASHEAR)
    adapterProvider.server.get('/v1/logout', handleCtx(async (bot, req, res) => {
        try {
            // Intentamos cerrar sesión de forma segura
            if (bot.provider && bot.provider.vendor && bot.provider.vendor.logout) {
                await bot.provider.vendor.logout()
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ status: 'ok' }))
        } catch (e) {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ status: 'ok', note: 'Session cleared' }))
        }
    }))

   adapterProvider.server.get('/v1/get-pairing', handleCtx(async (bot, req, res) => {
    try {
        const url = req.url || ''
        const params = new URLSearchParams(url.split('?')[1])
        const number = params.get('number')

        if (!number) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'error', message: 'Falta el numero' }))
        }

        // Acceder al método de pairing code
        const vendor = adapterProvider.vendor // Baileys directo
        
        if (vendor && vendor.requestPairingCode) {
            const code = await vendor.requestPairingCode(number)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', code }))
        } else {
            // Si el vendor no está listo, intentamos por el adapter
            const code = await adapterProvider.requestPairingCode(number)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', code }))
        }

    } catch (e) {
        console.error("Error en pairing:", e.message)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'error', message: "El motor no está listo, intenta de nuevo" }))
    }
}))
 // 4. QR
    adapterProvider.server.get('/v1/qr', handleCtx(async (bot, req, res) => {
        const qrPath = join(process.cwd(), 'bot.qr.png')
        if (existsSync(qrPath)) {
            const file = readFileSync(qrPath)
            res.writeHead(200, { 'Content-Type': 'image/png' })
            return res.end(file)
        }
        res.writeHead(404)
        res.end('No QR')
    }))
    // 1. STATUS
    adapterProvider.server.get('/v1/status', handleCtx(async (bot, req, res) => {
        const id = bot?.provider?.vendor?.user?.id
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', connected: !!id, number: id ? id.split(':')[0] : 'Desconectado' }))
    }))
// Al final de tu main, reemplaza el httpServer por esto:
const PORT_NUMBER = parseInt(process.env.PORT || '3008', 10);
httpServer(PORT_NUMBER, '0.0.0.0');

console.log(`✅ Servidor vinculado a 0.0.0.0:${PORT_NUMBER}`);
} 
main()
// Esto evita que el bot se apague si hay un error inesperado
process.on('uncaughtException', (err) => {
    console.error('Se detectó un error pero el bot seguirá encendido:', err.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('Error de promesa no manejada:', reason);
});
