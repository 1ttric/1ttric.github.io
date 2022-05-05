#!/bin/bash

set -euxo pipefail

echo -e "g\nn\n\n\n\nw" | fdisk /dev/sda
mkfs -t ext4 /dev/sda1
mount -t ext4 /dev/sda1 /mnt

sed -i 's/SigLevel.*/SigLevel = Never/g' /etc/pacman.conf

pacstrap -i /mnt base linux syslinux gptfdisk --noconfirm
genfstab -p /mnt >> /mnt/etc/fstab
sed -i 's/MODULES=()/MODULES=(atkbd i8042)/g' /mnt/etc/mkinitcpio.conf

cat << 'EOF' > /mnt/bootstrap.sh
#!/usr/bin/bash

set -euxo pipefail

sed -i 's/SigLevel.*/SigLevel = Never/g' /etc/pacman.conf
echo 'root:root' | chpasswd

mkinitcpio -p linux
syslinux-install_update -i -a -m
systemctl mask ldconfig.service

yes | pacman -Scc || true

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

UI menu.c32

LABEL Arch Linux
    LINUX ../vmlinuz-linux
    APPEND root=/dev/sda1 rw console=ttyS0 console=tty0
    INITRD ../initramfs-linux.img
EOF

umount -R /mnt