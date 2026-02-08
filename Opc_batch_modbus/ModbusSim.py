import time
import random
import math
from threading import Thread
from pymodbus.server.sync import StartTcpServer
from pymodbus.device import ModbusDeviceIdentification
from pymodbus.datastore import ModbusSequentialDataBlock, ModbusSlaveContext, ModbusServerContext
import struct
from dotenv import load_dotenv
import os
import json


load_dotenv()


MODBUS_HOSTIP=os.getenv("MODBUS_HOSTIP")
MODBUS_PORT = int(os.getenv("MODBUS_PORT"))
UPDATE_INTERVAL = float(os.getenv("UPDATE_INTERVAL"))
NO_OF_REGISTERS = int(os.getenv("NO_OF_REGISTERS"))


with open("modbus_config.json", "r") as f:
    MODBUS_CONFIG = json.load(f)

REGISTER_MAP =MODBUS_CONFIG["REGISTER_MAP"]

# {
# #     "Mixer_101": {"Speed": 0, "torque": 2, "Volume": 4, "Temperature": 6, "Power": 8, "Current": 10},
# #     "Mixer_102": {"Speed": 12, "torque": 14, "Volume": 16, "Temperature": 18, "Power": 20, "Current": 22},
# #     "Mixer_103": {"Speed": 24, "torque": 26, "Volume": 28, "Temperature": 30, "Power": 32, "Current": 34},
# # }

#Actual Modbus Register Mapping
#40001 -> Mixer_101 -> Speed 
#40003 -> Mixer_101 -> torque
#40005 -> Mixer_101 -> Volume
#40007 -> Mixer_101 -> Temperature
#40009 -> Mixer_101 -> Power
#40011 -> Mixer_101 -> Current


#40013 -> Mixer_102 -> Speed
#40015 -> Mixer_102 -> torque
#40017 -> Mixer_102 -> Volume
#40019 -> Mixer_102 -> Temperature
#40021 -> Mixer_102 -> Power
#40023 -> Mixer_102 -> Current

#40025 -> Mixer_103 -> Speed
#40027 -> Mixer_103 -> torque
#40029 -> Mixer_103 -> Volume
#40031 -> Mixer_103 -> Temperature
#40033 -> Mixer_103 -> Power
#40035 -> Mixer_103 -> Current


MIXER_SEQUENCES = MODBUS_CONFIG["MIXER_SEQUENCES"]

# {
#     "Mixer_101": [
#         {"torque": 25, "rpm": 400.000000, "vol_start": 1000, "vol_end": 1000, "temp": 25, "duration": 240},
#         {"torque": 10, "rpm": 50, "vol_start": 1000, "vol_end": 0, "temp": 25, "duration": 60},
#         {"torque": 10, "rpm": 50, "vol_start": 0, "vol_end": 0, "temp": 25, "duration": 60},
#     ],
#     "Mixer_102": [
#         {"torque": 90, "rpm": 1500, "vol_start": 1000, "vol_end": 1000, "temp": 25, "duration": 90},
#         {"torque": 20, "rpm": 50, "vol_start": 1000, "vol_end": 1000, "temp": 25, "duration": 60},
#         {"torque": 20, "rpm": 50, "vol_start": 1000, "vol_end": 1200, "temp": 25, "duration": 100},
#         {"torque": 25, "rpm": 600, "vol_start": 1200, "vol_end": 1200, "temp": 25, "duration": 60},
#         {"torque": 40, "rpm": 1500, "vol_start": 1200, "vol_end": 1200, "temp": 25, "duration": 120},
#         {"torque": 20, "rpm": 50, "vol_start": 1200, "vol_end": 1300, "temp": 25, "duration": 50},
#         {"torque": 40, "rpm": 600, "vol_start": 1300, "vol_end": 1300, "temp": 25, "duration": 30},
#         {"torque": 40, "rpm": 1500, "vol_start": 1300, "vol_end": 1300, "temp": 25, "duration": 60},
#         {"torque": 10, "rpm": 50, "vol_start": 1300, "vol_end": 300, "temp": 25, "duration": 200},
#         {"torque": 10, "rpm": 50, "vol_start": 0, "vol_end": 0, "temp": 25, "duration": 60},
#     ],
#     "Mixer_103": [
#         {"torque": 90, "rpm": 1500, "vol_start": 1000, "vol_end": 1000, "temp": 25, "duration": 150},
#         {"torque": 40, "rpm": 1500, "vol_start": 1000, "vol_end": 1000, "temp": 25, "duration": 150},
#         {"torque": 10, "rpm": 50, "vol_start": 1000, "vol_end": 0, "temp": 25, "duration": 150},
#         {"torque": 10, "rpm": 50, "vol_start": 0, "vol_end": 0, "temp": 25, "duration": 60},
#     ],
# }


class MixtureState:
    def __init__(self, mixer_name):
        self.mixer_name = mixer_name
        self.sequence = MIXER_SEQUENCES[mixer_name]
        self.current_step_index = 0
        self.step_elapsed_time = 0.0

    def advance(self, dt):
        self.step_elapsed_time += dt
        step = self.sequence[self.current_step_index]

        if self.step_elapsed_time >= step["duration"]:
            self.step_elapsed_time = 0.0
            self.current_step_index += 1

            if self.current_step_index >= len(self.sequence):
                self.current_step_index = 0

    def get_current_step(self):
        return self.sequence[self.current_step_index]

    def get_elapsed_time(self):
        return self.step_elapsed_time


def calculate_volume(step, elapsed):
    duration = step["duration"]

    if duration == 0:
        return step["vol_end"]

    progress = elapsed / duration

    if progress > 1:
        progress = 1

    volume = step["vol_start"] + progress * (step["vol_end"] - step["vol_start"])

    return int(volume)


def float_to_registers(value):
    """
    Convert a float (REAL) into 2 Modbus registers (16-bit each)
    Big Endian format (high word first)
    """
    # pack float into 4 bytes
    packed = struct.pack('>f', float(value))
    # unpack into 2 16-bit registers
    reg1, reg2 = struct.unpack('>HH', packed)
    return [reg1, reg2]


STEP_SIGNALS=MODBUS_CONFIG["STEP_SIGNALS"]
def resolve_signal_value(signal, step, elapsed, cache):

    # 1️⃣ Signals coming directly from step
    if signal in STEP_SIGNALS:

        # normalize common step key differences
        if signal == "Speed":
            return step["rpm"]

        if signal == "Temperature":
            return step["temp"]

        if signal == "Volume":
            return calculate_volume(step, elapsed)

        # direct passthrough (torque, vibration, etc.)
        return step[signal]

    # 2️⃣ Derived signals
    if signal == "Power":
        return cache["Speed"] * cache["torque"] / 100

    if signal == "Current":
        return cache["Power"] / 10

    raise ValueError(f"Unknown signal: {signal}")


def write_to_registers(context, mixer_name, step, elapsed):
    base = REGISTER_MAP[mixer_name]
    computed = {}

    for signal, register in base.items():
       
        value = resolve_signal_value(signal, step, elapsed, computed)
        computed[signal] = value

       
        regs = float_to_registers(value)

        
        context[0x00].setValues(3, register, regs)

# def write_to_registers(context, mixer_name, step, elapsed):
#     base = REGISTER_MAP[mixer_name]
#     print(step)
#     print(elapsed)
    
#     for signal,register in base.items():
#         print(f"Signal :{signal} , Register:{register}")

#     speed = step["rpm"]
#     print(speed)
#     torque = step["torque"]
#     volume = calculate_volume(step, elapsed)
#     temperature = step["temp"]
#     power = int(speed * torque / 100)
#     current = int(power / 10)

#     speed_regs       = float_to_registers(speed)
#     torque_regs      = float_to_registers(torque)
#     volume_regs      = float_to_registers(volume)
#     temperature_regs = float_to_registers(temperature)
#     power_regs       = float_to_registers(power)
#     current_regs     = float_to_registers(current)

    # #writing all the values on resgiter adress so can be read by the opcus client 
    # context[0x00].setValues(3, base["Speed"], speed_regs)
    # context[0x00].setValues(3, base["torque"], torque_regs)
    # context[0x00].setValues(3, base["Volume"], volume_regs)
    # context[0x00].setValues(3, base["Temperature"], temperature_regs)
    # context[0x00].setValues(3, base["Power"], power_regs)
    # context[0x00].setValues(3, base["Current"], current_regs )


def print_mixer_values(mixer_name, step, elapsed):
    base = REGISTER_MAP[mixer_name]
    computed = {}

    print(f"\n{mixer_name}:")
    
    for signal in base.keys():
        value = resolve_signal_value(signal, step, elapsed, computed)
        computed[signal] = value

        
        if isinstance(value, float):
            value = round(value, 2)

        print(f"  {signal:<12}: {value}")

    print(f"  Step Time   : {elapsed:.1f}s / {step['duration']}s")

    # speed = step["rpm"]
    # torque = step["torque"]
    # volume = calculate_volume(step, elapsed)
    # temperature = step["temp"]
    # power = int(speed * torque / 100)
    # current = int(power / 10)
    

    # print(f"\n{mixer_name}:")
    # print(f"  Speed: {speed} RPM")
    # print(f"  Torque: {torque} Nm")
    # print(f"  Volume: {volume} L")
    # print(f"  Temperature: {temperature} °C")
    # print(f"  Power: {power} W")
    # print(f"  Current: {current} A")
    # print(f"  Step: {elapsed:.1f}s / {step['duration']}s")


def simulate_loop(context):
    """Main simulation loop that updates mixer states"""
    mixers = {
        name: MixtureState(name) for name in MIXER_SEQUENCES
    }

    last_time = time.time()

    while True:
        now = time.time()
        dt = now - last_time
        last_time = now

        print("\n" + "=" * 60)
        print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)

        for name, mixer_state in mixers.items():
            mixer_state.advance(dt)
            step = mixer_state.get_current_step()
            elapsed = mixer_state.get_elapsed_time()

            # Write to Modbus registers
            write_to_registers(context, name, step, elapsed)

            #printing the value on terminal
            print_mixer_values(name, step, elapsed)

        time.sleep(1)  # Update every second


def run_modbus_server():
    """Initialize and start the Modbus TCP server"""
    # Create data store with enough registers for all mixers
    #right now i have only one slave and 100 resgiter on that 
    store = ModbusSlaveContext(
        hr=ModbusSequentialDataBlock(0, [0] * int(NO_OF_REGISTERS)), 
    )
    context = ModbusServerContext(slaves=store, single=True)

    # Set up device identification
    identity = ModbusDeviceIdentification()
    identity.VendorName = 'Mixer Simulator'
    identity.ProductCode = 'MS'
    identity.VendorUrl = 'http://github.com/mixer-sim'
    identity.ProductName = 'Mixer Modbus Simulator'
    identity.ModelName = 'Mixer Sim 1.0'
    identity.MajorMinorRevision = '1.0.0'

    # Start simulation thread
    simulation_thread = Thread(target=simulate_loop, args=(context,), daemon=True)
    simulation_thread.start()

    # Start Modbus server
    print("Starting Modbus TCP Server on port 502...")
    print("Press Ctrl+C to stop\n")
    StartTcpServer(context, identity=identity, address=(MODBUS_HOSTIP, MODBUS_PORT))


if __name__ == "__main__":
    try:
        run_modbus_server()
    except KeyboardInterrupt:
        print("\n\nServer stopped by user")
    except Exception as e:
        print(f"\nError: {e}")