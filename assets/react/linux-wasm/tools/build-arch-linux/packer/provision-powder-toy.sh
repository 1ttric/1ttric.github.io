#!/bin/bash

set -euxo pipefail

echo -e "g\nn\n\n\n\nw" | fdisk /dev/sda
mkfs -t ext4 /dev/sda1
mount -t ext4 /dev/sda1 /mnt

sed -i 's/SigLevel.*/SigLevel = Never/g' /etc/pacman.conf

pacstrap -i /mnt base linux syslinux gptfdisk xorg-server libxi xorg-xrandr --noconfirm
genfstab -p /mnt >> /mnt/etc/fstab
sed -i 's/MODULES=()/MODULES=(atkbd i8042)/g' /mnt/etc/mkinitcpio.conf

cat << 'EOF' > /mnt/etc/systemd/system/Xorg.service
[Unit]
Description=Xorg
StartLimitIntervalSec=0

[Service]
ExecStart=/usr/bin/Xorg
Restart=always
RestartSec=1

[Install]
WantedBy=multi-user.target
EOF

cat << 'EOF' > /mnt/etc/systemd/system/powder-toy.service
[Unit]
Description=powder-toy
After=Xorg.service
StartLimitIntervalSec=0

[Service]
Environment=DISPLAY=:0
Environment=HOME=/tmp
Environment=XDG_DATA_HOME=/tmp
ExecStart=/bin/bash -c "xrandr && exec powder-toy"
Restart=always
RestartSec=1

[Install]
WantedBy=multi-user.target
EOF

cat << 'EOF' > /mnt/bootstrap.sh
#!/usr/bin/bash

set -euxo pipefail

sed -i 's/SigLevel.*/SigLevel = Never/g' /etc/pacman.conf
echo 'root:root' | chpasswd

systemctl enable Xorg powder-toy

mkinitcpio -p linux
syslinux-install_update -i -a -m
systemctl mask ldconfig.service

# Build app as 'builder'
pacman -Sy sudo fakeroot gcc pkgconf --noconfirm
useradd builder
echo "builder ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers
mkdir /home/builder
chown builder:builder /home/builder
cd /home/builder
sudo -u builder curl -o powder-toy.tar.gz https://aur.archlinux.org/cgit/aur.git/snapshot/powder-toy.tar.gz
sudo -u builder tar xzvf powder-toy.tar.gz
cd powder-toy
sudo -u builder sed -i 's/arch=.*/arch=(any)/' PKGBUILD
sudo -u builder makepkg -si --noconfirm

# Cleanup
pacman -Rcs sudo fakeroot gcc pkgconf --noconfirm
rm /etc/sudoers.pacsave
yes | pacman -Scc || true
cd /home
rm -rf builder
userdel builder

sync
EOF

arch-chroot /mnt bash bootstrap.sh
rm /mnt/bootstrap.sh
dd if=/dev/zero of=/mnt/file status=progress || true
rm /mnt/file

cat << 'EOF' > /mnt/boot/syslinux/syslinux.cfg
DEFAULT arch
PROMPT 0
TIMEOUT 20

#UI menu.c32

LABEL Arch Linux
    LINUX ../vmlinuz-linux
    APPEND root=/dev/sda1 rw console=ttyS0 console=tty0
    INITRD ../initramfs-linux.img
EOF

umount -R /mnt