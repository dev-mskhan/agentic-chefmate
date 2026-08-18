import { router } from './trpc'
import { getThreadProcedure }      from './procedures/get-thread'
import { listMessagesProcedure }   from './procedures/list-messages'
import { getUnreadCountProcedure } from './procedures/get-unread-count'
import { getMyThreadsProcedure }   from './procedures/get-my-threads'

export const appRouter = router({
  getThread:      getThreadProcedure,
  listMessages:   listMessagesProcedure,
  getUnreadCount: getUnreadCountProcedure,
  getMyThreads:   getMyThreadsProcedure,
})

export type AppRouter = typeof appRouter
