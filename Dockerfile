FROM linuxmintd/mint20.3-amd64:latest

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

RUN curl -sL https://deb.nodesource.com/setup_18.x | bash -

RUN apt-get install -y nodejs && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm@10.2.3

RUN sudo chown -R 185:185 "/root/.npm"

WORKDIR /home/sera-que-chove

RUN npm install
