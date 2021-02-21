# Detailed immers server guide for DigitalOcean

Installs all dependencies for running an immers server.
After completing these steps, follow the immers server deploy instructions in the [main readme](./README.md)

Start with DO MongoDB droplet for db installation & firewall setup and switch to non-root user

```
adduser myuser
usermod -aG sudo myuser
su - myuser
```

Install NodeJS 14 (w/ build tools for bcrypt)

```
cd ~
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y build-essential
```

Install pm2 and authbind to run server with public port access

```
sudo npm install pm2@latest -g
sudo apt-get install authbind
sudo touch /etc/authbind/byport/443
sudo chown $USER /etc/authbind/byport/443
sudo chmod 755 /etc/authbind/byport/443
sudo touch /etc/authbind/byport/80
sudo chown $USER /etc/authbind/byport/80
sudo chmod 755 /etc/authbind/byport/80
```
