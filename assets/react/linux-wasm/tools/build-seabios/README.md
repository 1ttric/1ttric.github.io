#
# Automatically generated file; DO NOT EDIT.
# SeaBIOS Configuration
#

#
# General Features
#
CONFIG_QEMU=y
CONFIG_QEMU_HARDWARE=y
CONFIG_XEN=y
CONFIG_THREADS=y
CONFIG_BOOTORDER=y
CONFIG_MULTIBOOT=y
CONFIG_ENTRY_EXTRASTACK=y
CONFIG_MALLOC_UPPERMEMORY=y
CONFIG_ROM_SIZE=0

#
# Hardware support
#
CONFIG_ATA=y
CONFIG_ATA_DMA=y
CONFIG_ATA_PIO32=y
CONFIG_AHCI=y
CONFIG_SDCARD=y
CONFIG_VIRTIO_BLK=y
CONFIG_VIRTIO_SCSI=y
CONFIG_PVSCSI=y
CONFIG_ESP_SCSI=y
CONFIG_LSI_SCSI=y
CONFIG_MEGASAS=y
CONFIG_MPT_SCSI=y
CONFIG_FLOPPY=y
CONFIG_FLASH_FLOPPY=y
CONFIG_PS2PORT=y
CONFIG_SERIAL=y
CONFIG_LPT=y
CONFIG_RTC_TIMER=y
CONFIG_HARDWARE_IRQ=y
CONFIG_USE_SMM=y
CONFIG_CALL32_SMM=y
CONFIG_MTRR_INIT=y
CONFIG_PMTIMER=y
CONFIG_TSC_TIMER=y

#
# BIOS interfaces
#
CONFIG_DRIVES=y
CONFIG_CDROM_BOOT=y
CONFIG_CDROM_EMU=y
CONFIG_PCIBIOS=y
CONFIG_APMBIOS=y
CONFIG_PNPBIOS=y
CONFIG_OPTIONROMS=y
CONFIG_PMM=y
CONFIG_BOOT=y
CONFIG_KEYBOARD=y
CONFIG_KBD_CALL_INT15_4F=y
CONFIG_MOUSE=y
CONFIG_S3_RESUME=y
CONFIG_VGAHOOKS=y
CONFIG_TCGBIOS=y

#
# BIOS Tables
#
CONFIG_PIRTABLE=y
CONFIG_MPTABLE=y
CONFIG_ACPI=y
CONFIG_ACPI_DSDT=y
CONFIG_FW_ROMFILE_LOAD=y

#
# VGA ROM
#
CONFIG_VGA_BOCHS=y
CONFIG_VGA_BOCHS_STDVGA=y
CONFIG_BUILD_VGABIOS=y
CONFIG_VGA_STDVGA_PORTS=y
CONFIG_VGA_FIXUP_ASM=y
CONFIG_VGA_ALLOCATE_EXTRA_STACK=y
CONFIG_VGA_EXTRA_STACK_SIZE=512
CONFIG_VGA_VBE=y
CONFIG_VGA_PCI=y
CONFIG_OVERRIDE_PCI_ID=y
CONFIG_VGA_VID=0x1234
CONFIG_VGA_DID=0x1111

#
# Debugging
#
CONFIG_DEBUG_LEVEL=0
