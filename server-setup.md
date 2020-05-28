# Detailed immers server guide for DigitalOcean

Installs all dependencies for running an immers server.
After completing these steps, follow the immers server deploy instructions in the [main readme](./README.md)

Start with DO MongoDB droplet for db installation & firewall setup and switch to non-root user

```
adduser myuser
usermod -aG sudo myuser
su - myuser
```

Install NodeJS 12 w/ build tools (for bcrypt)

```
cd ~
curl -sL https://deb.nodesource.com/setup_12.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh
sudo apt-get install -y nodejs
```

Install pm2 and authbind to run server with public port access (replace myuser)

```
sudo npm install pm2@latest -g
sudo apt-get install authbind
sudo touch /etc/authbind/byport/443
sudo chown myuser /etc/authbind/byport/443
sudo chmod 755 /etc/authbind/byport/443
sudo touch /etc/authbind/byport/80
sudo chown myuser /etc/authbind/byport/80
sudo chmod 755 /etc/authbind/byport/80
```

SSL via certbot (replace domain name, username)

```
sudo add-apt-repository ppa:certbot/certbot
sudo apt update
sudo apt install certbot
sudo certbot certonly --standalone --preferred-challenges http -d example.com
sudo cp -RL /etc/letsencrypt/live/example.com/. certs/
sudo chown -R myuser certs/.
```
