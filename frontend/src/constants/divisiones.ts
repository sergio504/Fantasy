export const DIVISION_LABEL: Record<string, string> = {
  RFEF2_GRUPO_II: '2ª RFEF - Grupo II',
  RFEF3_GRUPO_IV: '3ª RFEF - Grupo IV',
  HONOR_BIZKAIA:  'D. Honor Bizkaia',
}

export const DIVISION_STYLE: Record<string, { badge: string; bg: string; border: string; bar: string; text: string }> = {
  RFEF2_GRUPO_II: { badge: 'bg-amber-100 text-amber-700',      bg: 'bg-amber-50',    border: 'border-amber-200',   bar: 'bg-amber-400',   text: 'text-amber-700'    },
  RFEF3_GRUPO_IV: { badge: 'bg-blue-100 text-blue-700',         bg: 'bg-blue-50',     border: 'border-blue-200',    bar: 'bg-blue-400',    text: 'text-blue-700'     },
  HONOR_BIZKAIA:  { badge: 'bg-emerald-100 text-emerald-700',   bg: 'bg-emerald-50',  border: 'border-emerald-200', bar: 'bg-emerald-400', text: 'text-emerald-700'  },
}

export const DIVISIONES = Object.keys(DIVISION_LABEL) as (keyof typeof DIVISION_LABEL)[]
