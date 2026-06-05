import { Link } from 'react-router-dom'

const features = [
  {
    icon: '🏆',
    title: 'Crea tu liga',
    desc: 'Pública o privada, con el presupuesto y el número de equipos que quieras.',
  },
  {
    icon: '⚽',
    title: 'Ficha jugadores',
    desc: 'Jugadores reales de 2ª RFEF, 3ª RFEF y División de Honor de Bizkaia. 16 jugadores asignados al entrar.',
  },
  {
    icon: '💰',
    title: 'Mercado activo',
    desc: 'Pon jugadores a la venta, puja por los rivales y gestiona tu presupuesto.',
  },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-50 via-white to-purple-50 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 py-20 sm:py-28 text-center">
          <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
            Fantasy para divisiones locales
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
            Tu liga, tus reglas,<br />
            <span className="text-indigo-600">tus jugadores</span>
          </h1>
          <p className="text-gray-500 text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            Compite con amigos fichando jugadores reales de tu división. Gestiona tu equipo, opera en el mercado y lidera la clasificación.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 text-base"
            >
              Empezar gratis →
            </Link>
            <Link
              to="/login"
              className="px-8 py-3.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-base"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-xl font-bold text-gray-900 mb-10">
            Todo lo que necesitas para jugar
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {features.map(f => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-indigo-600 px-4 py-14 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">¿Listo para competir?</h2>
        <p className="text-indigo-200 mb-6 text-sm">Gratis, sin publicidad, para tu liga local.</p>
        <Link
          to="/register"
          className="inline-block bg-white text-indigo-600 font-semibold px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          Crear cuenta
        </Link>
      </section>
    </div>
  )
}
