import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import passport from 'passport'
import { localStrategy } from '../strategies/local.strategy'
import { googleStrategy } from '../strategies/google.strategy'

export default fp(async function passportPlugin(fastify: FastifyInstance) {
  passport.use(localStrategy)
  passport.use(googleStrategy)

  // Minimal serialize/deserialize (we use JWT — sessions are stateless)
  passport.serializeUser((user, done) => done(null, user))
  passport.deserializeUser((user, done) => done(null, user as Express.User))

  fastify.log.info('Passport strategies registered')
})
