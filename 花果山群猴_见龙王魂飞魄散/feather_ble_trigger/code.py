import time

import adafruit_ble
import board
import neopixel
from adafruit_ble.advertising import Advertisement
from adafruit_ble.advertising.standard import ProvideServicesAdvertisement
from adafruit_ble.services.standard.hid import HIDService
from adafruit_hid.keyboard import Keyboard
from adafruit_hid.keycode import Keycode
from analogio import AnalogIn

i2c = board.I2C()

try:
    from adafruit_lsm6ds.lsm6ds33 import LSM6DS33 as LSM6DS

    imu = LSM6DS(i2c)
except RuntimeError:
    from adafruit_lsm6ds.lsm6ds3trc import LSM6DS3TRC as LSM6DS

    imu = LSM6DS(i2c)

ble = adafruit_ble.BLERadio()
ble.name = "Monkey Bolt"
hid = HIDService()
advertisement = ProvideServicesAdvertisement(hid)
advertisement.appearance = 961
scan_response = Advertisement()
scan_response.complete_name = "Monkey Bolt"
keyboard = Keyboard(hid.devices)
pixel = neopixel.NeoPixel(board.NEOPIXEL, 1, brightness=0.08, auto_write=False)
vbat = AnalogIn(board.VOLTAGE_MONITOR)

COOLDOWN = 0.1
TRIGGER_DELTA = 14.0
ARM_DELTA = 24.0
SAMPLE_DELAY = 0.01
GREEN_MIN = 3.8
ORANGE_MIN = 3.65
CUTOFF_MIN = 3.55
ADV_TIME = 12
REARM_DELAY = 2

advertising = False
last_fire = 0.0
last_accel = imu.acceleration
last_battery_check = 0.0
battery = 0.0
dead = False
advertising_until = 0.0
rearm_at = 0.0
was_connected = False


def battery_voltage():
    return vbat.value * vbat.reference_voltage * 2 / 65535


def battery_color(voltage):
    if voltage >= GREEN_MIN:
        return (0, 32, 0)
    if voltage >= ORANGE_MIN:
        return (32, 10, 0)
    return (32, 0, 0)


def show_status(now, voltage):
    if advertising and int(now * 8) % 2:
        pixel[0] = (0, 0, 32)
    elif advertising:
        pixel[0] = (0, 0, 0)
    else:
        pixel[0] = battery_color(voltage)
    pixel.show()


def stop_advertising():
    global advertising
    if advertising:
        ble.stop_advertising()
        advertising = False
        print("Advertising off")


def arm_advertising(now):
    global advertising, advertising_until
    if dead or ble.connected:
        return
    advertising_until = now + ADV_TIME
    if not advertising:
        ble.start_advertising(advertisement, scan_response)
        advertising = True
        print("Advertising as", ble.name)


while True:
    now = time.monotonic()

    if now - last_battery_check >= 1:
        battery = battery_voltage()
        last_battery_check = now
        if battery <= CUTOFF_MIN:
            dead = True
            print("Battery low", battery)
            stop_advertising()

    show_status(now, battery)

    if dead:
        time.sleep(1)
        continue

    accel = imu.acceleration
    delta = sum(abs(a - b) for a, b in zip(accel, last_accel))
    last_accel = accel

    if ble.connected:
        advertising = False
        was_connected = True
    else:
        if was_connected:
            was_connected = False
            stop_advertising()
            rearm_at = now + REARM_DELAY
            print("Disconnected")
        if advertising and now >= advertising_until:
            stop_advertising()
        elif now >= rearm_at and delta > ARM_DELTA:
            arm_advertising(now)

    if ble.connected and delta > TRIGGER_DELTA and now - last_fire >= COOLDOWN:
        print("Space", delta)
        keyboard.send(Keycode.SPACE)
        last_fire = now

    time.sleep(SAMPLE_DELAY)
