FROM bitnami/node:18.18.2

COPY --chown=185 ./ /home/sera-que-chove/

WORKDIR /home/sera-que-chove

ENTRYPOINT ["npm", "start"]