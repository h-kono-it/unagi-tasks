import { App, staticFiles } from "fresh";
import { define } from "./utils.ts";

export const app = new App();

app.use(staticFiles());
app.use(define.middleware(async (ctx) => {
  return await ctx.next();
}));

app.fsRoutes();

export default app;
