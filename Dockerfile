FROM nginx:alpine

COPY . /usr/share/nginx/html

# Replace API_BASE placeholder at container startup via envsubst
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
