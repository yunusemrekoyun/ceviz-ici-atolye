'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

// ── Country list ───────────────────────────────────────────────────────────────

export interface Country {
  code: string;
  flag: string;
  dial: string;
  name: string;
}

export const COUNTRIES: Country[] = [
  { code: 'TR', flag: '🇹🇷', dial: '+90',  name: 'Türkiye'       },
  { code: 'DE', flag: '🇩🇪', dial: '+49',  name: 'Almanya'       },
  { code: 'AR', flag: '🇦🇷', dial: '+54',  name: 'Arjantin'      },
  { code: 'AU', flag: '🇦🇺', dial: '+61',  name: 'Avustralya'    },
  { code: 'AT', flag: '🇦🇹', dial: '+43',  name: 'Avusturya'     },
  { code: 'AZ', flag: '🇦🇿', dial: '+994', name: 'Azerbaycan'    },
  { code: 'AE', flag: '🇦🇪', dial: '+971', name: 'BAE'           },
  { code: 'BG', flag: '🇧🇬', dial: '+359', name: 'Bulgaristan'   },
  { code: 'CN', flag: '🇨🇳', dial: '+86',  name: 'Çin'           },
  { code: 'DZ', flag: '🇩🇿', dial: '+213', name: 'Cezayir'       },
  { code: 'BR', flag: '🇧🇷', dial: '+55',  name: 'Brezilya'      },
  { code: 'EG', flag: '🇪🇬', dial: '+20',  name: 'Mısır'         },
  { code: 'FR', flag: '🇫🇷', dial: '+33',  name: 'Fransa'        },
  { code: 'GR', flag: '🇬🇷', dial: '+30',  name: 'Yunanistan'    },
  { code: 'IN', flag: '🇮🇳', dial: '+91',  name: 'Hindistan'     },
  { code: 'IQ', flag: '🇮🇶', dial: '+964', name: 'Irak'          },
  { code: 'IR', flag: '🇮🇷', dial: '+98',  name: 'İran'          },
  { code: 'ES', flag: '🇪🇸', dial: '+34',  name: 'İspanya'       },
  { code: 'SE', flag: '🇸🇪', dial: '+46',  name: 'İsveç'         },
  { code: 'CH', flag: '🇨🇭', dial: '+41',  name: 'İsviçre'       },
  { code: 'GB', flag: '🇬🇧', dial: '+44',  name: 'İngiltere'     },
  { code: 'IT', flag: '🇮🇹', dial: '+39',  name: 'İtalya'        },
  { code: 'JP', flag: '🇯🇵', dial: '+81',  name: 'Japonya'       },
  { code: 'CA', flag: '🇨🇦', dial: '+1',   name: 'Kanada'        },
  { code: 'QA', flag: '🇶🇦', dial: '+974', name: 'Katar'         },
  { code: 'KZ', flag: '🇰🇿', dial: '+77',  name: 'Kazakistan'    },
  { code: 'KR', flag: '🇰🇷', dial: '+82',  name: 'Güney Kore'    },
  { code: 'KW', flag: '🇰🇼', dial: '+965', name: 'Kuveyt'        },
  { code: 'LB', flag: '🇱🇧', dial: '+961', name: 'Lübnan'        },
  { code: 'LY', flag: '🇱🇾', dial: '+218', name: 'Libya'         },
  { code: 'MA', flag: '🇲🇦', dial: '+212', name: 'Fas'           },
  { code: 'MX', flag: '🇲🇽', dial: '+52',  name: 'Meksika'       },
  { code: 'NL', flag: '🇳🇱', dial: '+31',  name: 'Hollanda'      },
  { code: 'NG', flag: '🇳🇬', dial: '+234', name: 'Nijerya'       },
  { code: 'NO', flag: '🇳🇴', dial: '+47',  name: 'Norveç'        },
  { code: 'PL', flag: '🇵🇱', dial: '+48',  name: 'Polonya'       },
  { code: 'PT', flag: '🇵🇹', dial: '+351', name: 'Portekiz'      },
  { code: 'RO', flag: '🇷🇴', dial: '+40',  name: 'Romanya'       },
  { code: 'RU', flag: '🇷🇺', dial: '+7',   name: 'Rusya'         },
  { code: 'SA', flag: '🇸🇦', dial: '+966', name: 'S. Arabistan'  },
  { code: 'SY', flag: '🇸🇾', dial: '+963', name: 'Suriye'        },
  { code: 'TN', flag: '🇹🇳', dial: '+216', name: 'Tunus'         },
  { code: 'UA', flag: '🇺🇦', dial: '+380', name: 'Ukrayna'       },
  { code: 'US', flag: '🇺🇸', dial: '+1',   name: 'ABD'           },
  { code: 'YE', flag: '🇾🇪', dial: '+967', name: 'Yemen'         },
  { code: 'ZA', flag: '🇿🇦', dial: '+27',  name: 'G. Afrika'     },
];

// ── Parse helpers ──────────────────────────────────────────────────────────────

function parseValue(value: string): { country: Country; number: string } {
  const defaultCountry = COUNTRIES.find(c => c.code === 'TR')!;
  if (!value) return { country: defaultCountry, number: '' };

  // Sort by dial length descending so "+971" matches before "+7"
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (value.startsWith(c.dial)) {
      return { country: c, number: value.slice(c.dial.length).replace(/\D/g, '').slice(0, 15) };
    }
  }

  // Raw digits with no country prefix — keep TR as default
  return { country: defaultCountry, number: value.replace(/\D/g, '').slice(0, 15) };
}

// ── Component ──────────────────────────────────────────────────────────────────

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function PhoneInput({
  value,
  onChange,
  className = '',
  inputClassName = '',
  disabled = false,
  placeholder,
}: PhoneInputProps) {
  const parsed               = parseValue(value);
  const [country, setCountry] = useState<Country>(parsed.country);
  const [number, setNumber]  = useState(parsed.number);
  const [open, setOpen]      = useState(false);
  const [search, setSearch]  = useState('');
  const dropdownRef          = useRef<HTMLDivElement>(null);
  const searchRef            = useRef<HTMLInputElement>(null);

  // Sync from outside if value changes (e.g. form reset)
  useEffect(() => {
    const p = parseValue(value);
    setCountry(p.country);
    setNumber(p.number);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => searchRef.current?.focus(), 60);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function selectCountry(c: Country) {
    setCountry(c);
    setOpen(false);
    onChange(c.dial + number);
  }

  function handleNumberChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 15);
    setNumber(digits);
    onChange(country.dial + digits);
  }

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const ph = placeholder ?? (country.code === 'TR' ? '5XX XXX XX XX' : 'Numara');

  return (
    <div className={`relative flex items-stretch control-base p-0 ${className}`} ref={dropdownRef}>
      {/* Country selector */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 pl-3 pr-2.5 py-2.5 shrink-0 border-r border-m-border hover:bg-m-hover transition-colors rounded-l-xl disabled:opacity-50"
      >
        <span className="text-base leading-none">{country.flag}</span>
        <span className="text-xs font-mono text-muted">{country.dial}</span>
        <ChevronDown size={11} className={`text-subtle transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Number input */}
      <input
        type="tel"
        value={number}
        onChange={e => handleNumberChange(e.target.value)}
        disabled={disabled}
        placeholder={ph}
        maxLength={15}
        className={`flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm text-main placeholder:text-faint focus:outline-none disabled:opacity-50 ${inputClassName}`}
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-[200] w-64 modal-shell overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-m-border">
            <Search size={12} className="text-subtle shrink-0" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ara…"
              className="flex-1 bg-transparent text-xs text-main placeholder:text-faint focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-subtle hover:text-main">
                <X size={11} />
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-52">
            {filtered.length === 0 ? (
              <p className="text-xs text-subtle text-center py-4">Bulunamadı</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => selectCountry(c)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-m-hover transition-colors ${
                    c.code === country.code ? 'bg-brand-accent/10 text-brand-accent' : 'text-muted'
                  }`}
                >
                  <span className="text-base leading-none w-6 shrink-0">{c.flag}</span>
                  <span className="flex-1 text-xs truncate">{c.name}</span>
                  <span className="text-[10px] font-mono text-subtle shrink-0">{c.dial}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
