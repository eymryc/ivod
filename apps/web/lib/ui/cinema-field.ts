/**
 * Design system formulaire iVOD — viewer, admin, studio, auth, settings.
 * Select2-inspired : IvodSelect (custom) + IvodNativeSelect / selectCls (natif stylisé).
 */

export const IVOD_FIELD_LABEL =
  "block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 mb-2";

/** Alias admin (rails, droits, bannières…) */
export const labelCls = IVOD_FIELD_LABEL;

export const IVOD_INPUT =
  "ivod-btn ivod-cinema-input w-full px-4 py-3 bg-[#040810]/80 border border-white/[0.09] text-sm text-white placeholder:text-white/28 font-light shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,box-shadow,background] duration-200 focus:outline-none focus:border-brand-magenta/45 focus:bg-[#060c16]/90 focus:shadow-[0_0_0_1px_rgba(230,0,126,0.12),inset_0_1px_0_rgba(255,255,255,0.04)] disabled:opacity-45 disabled:cursor-not-allowed";

export const IVOD_INPUT_SM =
  "ivod-btn ivod-cinema-input w-full px-3 py-2.5 bg-[#040810]/80 border border-white/[0.09] text-[13px] text-white placeholder:text-white/28 font-light shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,box-shadow,background] duration-200 focus:outline-none focus:border-brand-magenta/45 focus:bg-[#060c16]/90 focus:shadow-[0_0_0_1px_rgba(230,0,126,0.12)] disabled:opacity-45";

/** Champs texte standard — admin / studio / viewer */
export const inputCls = IVOD_INPUT;

/** Champs compacts (tableaux admin, rails) */
export const inputClsSm = `${IVOD_INPUT_SM} h-10`;

export const IVOD_TEXTAREA =
  "ivod-btn ivod-cinema-textarea w-full min-h-[5.5rem] px-4 py-3 bg-[#040810]/80 border border-white/[0.09] text-sm text-white placeholder:text-white/28 font-light leading-relaxed resize-y shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,box-shadow,background] duration-200 focus:outline-none focus:border-brand-magenta/45 focus:bg-[#060c16]/90 focus:shadow-[0_0_0_1px_rgba(230,0,126,0.12)] disabled:opacity-45";

export const textareaCls = IVOD_TEXTAREA;

export const IVOD_NATIVE_SELECT =
  "ivod-btn ivod-native-select w-full appearance-none cursor-pointer px-4 py-3 pr-10 bg-[#040810]/80 border border-white/[0.09] text-sm text-white/90 font-light shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,box-shadow,background] duration-200 hover:border-brand-magenta/30 hover:bg-[#060c16]/70 focus:outline-none focus:border-brand-magenta/45 focus:shadow-[0_0_0_1px_rgba(230,0,126,0.12)] disabled:opacity-45";

export const IVOD_NATIVE_SELECT_SM = `${IVOD_NATIVE_SELECT} py-2.5 text-[13px]`;

export const IVOD_NATIVE_SELECT_WRAP = "ivod-native-select-wrap relative";

export const selectCls = `${IVOD_NATIVE_SELECT} cursor-pointer`;

export const IVOD_SELECT_TRIGGER =
  "ivod-btn ivod-select-trigger w-full flex items-center justify-between gap-3 px-4 py-3 bg-[#040810]/80 border border-white/[0.09] text-left text-sm text-white/90 font-light shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,box-shadow,background] duration-200 hover:border-brand-magenta/30 hover:bg-[#060c16]/70 focus:outline-none focus:border-brand-magenta/45 disabled:opacity-45";

export const IVOD_SELECT_TRIGGER_SM = `${IVOD_SELECT_TRIGGER} py-2.5 text-[13px]`;

export const IVOD_PANEL =
  "rounded-none border border-white/[0.08] bg-[#040810]/60 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.75)] backdrop-blur-sm";

export const IVOD_PIN_INPUT =
  "ivod-btn ivod-cinema-input w-full px-4 py-3.5 pr-12 bg-[#040810]/80 border border-white/[0.12] text-center text-2xl tracking-[0.35em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:outline-none focus:border-brand-magenta/45 focus:shadow-[0_0_0_1px_rgba(230,0,126,0.12)] transition-colors";

/** Rétrocompat */
export const authInputClass = `${IVOD_INPUT} h-11`;
export const authOtpInputClass =
  "ivod-btn ivod-cinema-input w-full h-14 px-4 bg-[#040810]/80 border border-white/[0.09] text-2xl text-center tracking-[0.35em] font-mono text-white placeholder:text-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:outline-none focus:border-brand-magenta/45 focus:shadow-[0_0_0_1px_rgba(230,0,126,0.12)] transition-colors";

export const SETTINGS_INPUT_CLASS = `${IVOD_INPUT} py-3.5 text-[15px]`;
export const SETTINGS_TEXTAREA_CLASS = IVOD_TEXTAREA;
export const PROFILE_INPUT_CLASS = SETTINGS_INPUT_CLASS;

export const studioInputCls = IVOD_INPUT;
export const studioSelectCls = selectCls;
export const selectClass = IVOD_NATIVE_SELECT_SM;

/** Recherche avec icône (admin paiements, studio contenus) */
export const IVOD_SEARCH_INPUT =
  "ivod-btn ivod-cinema-input ivod-search-input w-full h-11 pl-10 pr-4 text-sm text-white placeholder:text-white/32 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:outline-none focus:border-brand-magenta/45 focus:shadow-[0_0_0_1px_rgba(230,0,126,0.12)] transition-[border-color,box-shadow] duration-200";
