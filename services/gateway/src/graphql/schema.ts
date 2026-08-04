import "./types/user.type.js";
import "./types/session.type.js";
import "./resolvers/query.resolvers.js";
import "./resolvers/mutation.resolvers.js";
import { builder } from "./builder.js";

export const schema = builder.toSchema();
