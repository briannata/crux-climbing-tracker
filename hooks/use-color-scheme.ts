import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * React Native reports 'unspecified' (and null) alongside the two real
 * schemes. The app only ever wants one of the two, so collapse it here rather
 * than at every call site.
 */
export function useColorScheme(): 'light' | 'dark' {
  return useRNColorScheme() === 'dark' ? 'dark' : 'light';
}
