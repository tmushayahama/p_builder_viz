// Central hub for the pre-typed Redux hooks. Importing `useDispatch`/`useSelector`
// straight from react-redux is a lint error everywhere else, so this file is the
// one place the rule is disabled.
/* eslint-disable @typescript-eslint/no-restricted-imports */
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '@/app/store/store'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
