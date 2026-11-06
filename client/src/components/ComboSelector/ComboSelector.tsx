import { useState, useEffect } from 'react'
import { Popcorn, Plus, Minus, ShoppingBag, Loader2 } from 'lucide-react'
import { paymentApi, type Combo } from '../../api/paymentApi'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

const fixImageUrl = (url?: string) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const backendBase = (
    import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  ).replace(/\/api\/?$/, '')
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`
}

export interface SelectedCombo {
  comboId: string
  quantity: number
  name: string
  unitPrice: number
  selectedFlavor?: string
}

interface ComboSelectorProps {
  value: SelectedCombo[]
  onChange: (combos: SelectedCombo[]) => void
}

export default function ComboSelector({ value, onChange }: ComboSelectorProps) {
  const [combos, setCombos] = useState<Combo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    paymentApi
      .getCombos()
      .then(setCombos)
      .finally(() => setLoading(false))
  }, [])

  const getSelectedItem = (comboId: string) => {
    return value.find((c) => c.comboId === comboId)
  }

  const getQuantity = (comboId: string) => {
    return getSelectedItem(comboId)?.quantity ?? 0
  }

  const updateQuantity = (combo: Combo, delta: number) => {
    const current = getQuantity(combo._id)
    const next = Math.max(0, Math.min(10, current + delta))

    if (next === 0) {
      onChange(value.filter((c) => c.comboId !== combo._id))
    } else {
      const exists = getSelectedItem(combo._id)
      const defaultFlavor = combo.flavors && combo.flavors.length > 0 ? combo.flavors[0] : undefined

      if (exists) {
        onChange(
          value.map((c) => (c.comboId === combo._id ? { ...c, quantity: next } : c)),
        )
      } else {
        onChange([
          ...value,
          {
            comboId: combo._id,
            quantity: next,
            name: combo.name,
            unitPrice: combo.price,
            selectedFlavor: defaultFlavor,
          },
        ])
      }
    }
  }

  const updateFlavor = (combo: Combo, flavor: string) => {
    const exists = getSelectedItem(combo._id)
    if (exists) {
      onChange(
        value.map((c) => (c.comboId === combo._id ? { ...c, selectedFlavor: flavor } : c)),
      )
    } else {
      onChange([
        ...value,
        {
          comboId: combo._id,
          quantity: 1,
          name: combo.name,
          unitPrice: combo.price,
          selectedFlavor: flavor,
        },
      ])
    }
  }

  const totalCombo = value.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Đang tải combo bắp nước...</span>
      </div>
    )
  }

  if (combos.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center text-sm text-zinc-500">
        <Popcorn className="mx-auto mb-2 h-8 w-8 text-zinc-600" />
        Hiện chưa có combo bắp nước nào.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
        <Popcorn className="h-4 w-4 text-amber-400" />
        <span>Combo bắp nước</span>
        {value.length > 0 && (
          <span className="ml-auto rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
            {value.reduce((sum, c) => sum + c.quantity, 0)} món · {fmt(totalCombo)}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {combos.map((combo) => {
          const selectedItem = getSelectedItem(combo._id)
          const qty = selectedItem?.quantity ?? 0
          const isSelected = qty > 0

          return (
            <div
              key={combo._id}
              className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
                isSelected
                  ? 'border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/5'
                  : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
              }`}
            >
              {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />
              )}

              <div className="relative p-4">
                <div className="flex items-start gap-3">
                  {/* Icon combo / Image */}
                  <div
                    className={`flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-xl overflow-hidden transition-colors ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-300'
                    }`}
                  >
                    {combo.image ? (
                      <img
                        src={fixImageUrl(combo.image)}
                        alt={combo.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="h-6 w-6" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-zinc-100 truncate">
                      {combo.name}
                    </h4>

                    {/* Items chi tiết */}
                    {combo.items && combo.items.length > 0 && (
                      <p className="mt-0.5 text-xs text-zinc-400 truncate">
                        {combo.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                      </p>
                    )}

                    {combo.description && (
                      <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{combo.description}</p>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-amber-400">{fmt(combo.price)}</span>

                      {/* Counter controls */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(combo, -1)}
                          disabled={qty === 0}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 transition hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span
                          className={`w-8 text-center text-sm font-bold ${
                            qty > 0 ? 'text-amber-300' : 'text-zinc-500'
                          }`}
                        >
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(combo, 1)}
                          disabled={qty >= 10}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 transition hover:bg-amber-500/25 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chọn vị bỏng ngô */}
                {isSelected && combo.flavors && combo.flavors.length > 0 && (
                  <div className="mt-3 border-t border-zinc-800/80 pt-2.5">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-zinc-400">Chọn vị bỏng ngô:</span>
                      {selectedItem?.selectedFlavor && (
                        <span className="font-bold text-amber-400">
                          Đã chọn: {selectedItem.selectedFlavor}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {combo.flavors.map((flavor) => {
                        const isFlavorSelected = selectedItem?.selectedFlavor === flavor
                        return (
                          <button
                            key={flavor}
                            type="button"
                            onClick={() => updateFlavor(combo, flavor)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                              isFlavorSelected
                                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                                : 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                            }`}
                          >
                            {flavor}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
