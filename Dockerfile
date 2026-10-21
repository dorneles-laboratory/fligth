# syntax=docker/dockerfile:1
# ==============================================================================
# FlightScope — Nginx Servidor de Produção SPA
# ==============================================================================
FROM nginx:1.27-alpine

# Remove configuração padrão
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copia configuração otimizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os artefatos estáticos pré-compilados pelo Vite
COPY dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
