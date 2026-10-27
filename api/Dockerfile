FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node src ./src
COPY --chown=node:node migracoes ./migracoes
COPY --chown=node:node dados ./dados
# o pacote pode vir de um Windows com permissões só do dono: garante leitura para o usuário node
RUN chmod -R a+rX /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/saude || exit 1
CMD ["node", "src/servidor.js"]
