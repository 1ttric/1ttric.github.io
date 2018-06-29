---
title: VM host upgrade
tags: ["hardware", "work"]
cover: "/images/cover_serverreport.jpg"
date: 2018-03-10
---

This is a report I was tasked to write for work, to spec new parts and potential new builds for the upgrade of an all-SSD VM host

# VM Host Upgrade/Build Report

# Current Specs

Type    |Model
--------|-----
Server  |Dell PowerEdge R830
Compute |Intel Xeon E5-4628L v4 (x4)
Memory  |Samsung M393A4K40CB1-CRC 2Rx4 ECC RDIMM DDR4 2400 32GB (x6)
Storage |PERC H330 integrated controller
<nbsp>  |Samsung SSD 850 EVO 1TB (x1)

# VM Capability

## CPU
Assigning 2 threads to each VM, consider each of the 4 CPUs has 28 threads
This server supports Intel Xeon E5-4600 v4 family processors.

efficiency of CPUs in this family:

Model        |Threads |Recommended customer price |$/thread
-------------|--------|---------------------------|--------
E5-4610 v4   |20      |**$1219**                  |**60.95**
E5-4620 v4   |20      |$1668                      |83.40
E5-4627 v4   |10      |$2225                      |222.50
*E5-4628L v4*|*28*    |*$2535*                    |*90.54*
E5-4640 v4   |24      |$2837                      |118.21
E5-4650 v4   |28      |$3838                      |137.07
E5-4655 v4   |16      |$4616                      |288.50
E5-4660 v4   |32      |$4727                      |147.72
E5-4667 v4   |36      |$5729                      |159.14
E5-4669 v4   |**44**  |$7007                      |159.25

As one VM uses two threads and this does not change, for our purposes $/thread is proportional to $/VM

Current CPU capability: (28*4/2 =) 56 VMs

Maximum CPU capability: (44*4/2 =) 88 VMs

## RAM
Continuing the current memory configuration, we can populate 2 of 3 DIMMs per channel per processor

With 4 processors, we will max out at 32GB * 32 = 1TB RAM
In an ideal world, with 2GB RAM per VM, we can run 500 VMs on the box

Current RAM capability: (32GB*6/2GB =) 96 VMs

Maximum RAM capability: (1TB/2GB =) 500 VMs

## Storage
As of the time of this writing, each VM is using between 1.5 and 2.7 GB of storage, for a total of 165GB across all VMs
With 81 VMs running, this averages to 2.03 GB per VM. I will round up to 2.5GB.

At the time of this writing, the server has 380GB of free space remaining.

We therefore have room for 380GB/2.5GB = 152 more VMs.
Storage is (relative to compute and RAM) cheap and easy to add, especially with the advent of multiterabyte SSDs, so this characteristic is essentially nonlimiting. We have also only filled one of the eight internal ports (two 4x mini-SAS) of the PERC H330

Current storage capability: (152+81 =) 233 VMs

## Summary
The lowest theoretical capability in our current configuration is CPU, at 56 VMs of capability

The highest number of VMs that remains stable (as determined empirically) is approximately 83, which is achievable as a result of the kernel's context switching mechanisms increasing throughput and preempting threads which are not being fully utilized.

To address compute limitation in the future we may consider running a hypervisor on this and future VM hosts to potentially reduce this penalty.

In order of significance, these are the characteristics that are limiting in a parallel virutalization context:

CPU -> RAM -> Storage

Under full load, the current build's memory becomes almost completely full, which suggests that our actual bottleneck is RAM usage

# Upgrades

Considering the experimental data and also the financial viability of upgrading different components, our best path forward at the moment is to increase the amount of RAM in the current server, as there are no processors in the E5-46xx v4 family that are sufficiently competitive to warrant replacing the four we currently have.

Provisioning the server with two more DIMMs will allow us to assess the impact of the memory bottleneck as it relates to the compute bottleneck

Item                               |Cost |Link
-----------------------------------|-----|----
M393A4K40CB1-CRC (x2)              |$680 |[X](https://www.amazon.com/dp/B01DTJ8EU6)
Total                              |$680 |

# New builds

If we choose to build a new VM host, there are several considerations to be made. Firstly, since compute is the most limiting resource, we must choose processors with a high number of threads.

The following table lists recent (E5 family and above) Intel Xeon processors for which all data was readily available (no blank columns) with a thread count of >28 and a $/thread value of <=100

For processors with price ranges, median price is assumed.

Model                                                      |Threads |Recommended customer price |$/thread
-----------------------------------------------------------|--------|---------------------------|--------
Intel® Xeon® Gold 6130 Processor (22M Cache, 2.10 GHz)     |32      |$1,894.00 - $1,900.00      |59.28
Intel® Xeon® Gold 6130F Processor (22M Cache, 2.10 GHz)    |32      |$2,049.00                  |64.03
Intel® Xeon® Gold 6130T Processor (22M Cache, 2.10 GHz)    |32      |$1,988.00                  |62.12
Intel® Xeon® Gold 6138 Processor (27.5M Cache, 2.00 GHz)   |40      |$2,612.00 - $2,618.00      |65.38
Intel® Xeon® Gold 6138F Processor (27.5M Cache, 2.00 GHz)  |40      |$2,767.00                  |69.17
Intel® Xeon® Gold 6138T Processor (27.5M Cache, 2.00 GHz)  |40      |$2,742.00                  |68.55
Intel® Xeon® Gold 6140 Processor (24.75M Cache, 2.30 GHz)  |36      |$2,445.00 - $2,451.00      |68.00
Intel® Xeon® Gold 6142 Processor (22M Cache, 2.60 GHz)     |32      |$2,946.00 - $2,952.00      |92.16
Intel® Xeon® Gold 6142F Processor (22M Cache, 2.60 GHz)    |32      |$3,101.00                  |96.91
Intel® Xeon® Gold 6148 Processor (27.5M Cache, 2.40 GHz)   |40      |$3,072.00 - $3,078.00      |76.88
Intel® Xeon® Gold 6148F Processor (27.5M Cache, 2.40 GHz)  |40      |$3,227.00                  |80.67
Intel® Xeon® Gold 6150 Processor (24.75M Cache, 2.70 GHz)  |36      |$3,358.00                  |93.28
Intel® Xeon® Gold 6152 Processor (30.25M Cache, 2.10 GHz)  |44      |$3,655.00 - $3,661.00      |83.14
Intel® Xeon® Gold 6154 Processor (24.75M Cache, 3.00 GHz)  |36      |$3,543.00                  |98.42
Intel® Xeon® Platinum 8153 Processor (22M Cache, 2.00 GHz) |32      |$3,115.00                  |97.34
Intel® Xeon® Platinum 8160 Processor (33M Cache, 2.10 GHz) |**48**  |$4,702.00 - $4,708.00      |98.02
Intel® Xeon® Processor E5-2683 v4 (40M Cache, 2.10 GHz)    |32      |**$1,846.00**              |**57.69**
Intel® Xeon® Processor E5-2695 v4 (45M Cache, 2.10 GHz)    |36      |$2,424.00 - $2,428.00      |67.39
Intel® Xeon® Processor E5-2697 v4 (45M Cache, 2.30 GHz)    |36      |$2,702.00                  |75.06
Intel® Xeon® Processor E5-2697A v4 (40M Cache, 2.60 GHz)   |32      |$2,891.00                  |90.34
Intel® Xeon® Processor E5-2698 v4 (50M Cache, 2.20 GHz)    |40      |$3,226.00                  |80.65
Intel® Xeon® Processor E5-2699 v4 (55M Cache, 2.20 GHz)    |44      |$4,115.00                  |93.52
Intel® Xeon® Processor E7-4850 v4 (40M Cache, 2.10 GHz)    |32      |$3,003.00                  |93.84

Firstly, we will want processors that are highly capable of parallel computation. Examining the table above, it is apparent that the Xeon Scalable line of processors (Bronze, Silver, Gold, Platinum) are competitive in both this category as well as the $/thread category, which is a variable we are interested in minimizing.

The processor selected below (Xeon Gold 6152) for the example new build has not only a greater number of threads than the processors we currently use (44 vs 28), but also a more competitive $/thread ratio (83.14 vs 90.54).

Assuming we stay within the Dell server ecosystem, we will require a 14th generation server body, as this generation is the first to support the Xeon Scalable processor family. Of Dell's 14th generation machines, only the R940 supports quad Xeon Scalable processors with the thread counts we need.

## Current build estimated breakdown
Item                               |Cost    |VM capability |Link
-----------------------------------|--------|--------------|----
Poweredge R830 4-socket            |$5,749  |              |[X](http://www.dell.com/en-us/work/shop/poweredge-rack-servers/poweredge-r830/spd/poweredge-r830)
Intel Xeon E5-4628L v4 (x4)        |$10,140 |56            |[X](https://ark.intel.com/products/93802/Intel-Xeon-Processor-E5-4628L-v4-35M-Cache-1_80-GHz)
M393A4K40CB1-CRC (x6)              |$2,040  |96            |[X](https://www.amazon.com/dp/B01DTJ8EU6)
Samsung SSD 850 EVO 1TB (x2)       |$700    |              |[X](https://www.amazon.com/dp/B00OBRFFAS)
Samsung SSD 850 EVO 2TB (x2)       |$1,500  |              |[X](https://www.amazon.com/dp/B010QD6W9I)
Total                              |$20,129 |              |
Cost/VM: $360

## Example new build estimated breakdown
Item                               |Cost    |VM capability |Link
-----------------------------------|--------|--------------|----
Poweredge R940 4-socket            |$8,329  |              |[X](http://www.dell.com/en-us/work/shop/cty/pdp/spd/poweredge-r940/pe_r940_12229)
Intel Xeon Gold 6152 (x4)          |$14,632 |96            |[X](https://ark.intel.com/products/93802/Intel-Xeon-Processor-E5-4628L-v4-35M-Cache-1_80-GHz)
M393A4K40CB1-CRC (x12)             |$4,080  |192           |[X](https://www.amazon.com/dp/B01DTJ8EU6)
Samsung SSD 850 EVO 2TB (x4)       |$3,000  |              |[X](https://www.amazon.com/dp/B010QD6W9I)
Total                              |$30,041 |              |
Cost/VM: $313

*Prices listed above are up to date as of the time of this writing*

# References
http://topics-cdn.dell.com/pdf/poweredge-r830_owner's%20manual_en-us.pdf

http://i.dell.com/sites/doccontent/shared-content/data-sheets/en/Documents/Dell-PowerEdge-RAID-Controller-H330.pdf

# Code

Intel makes processor specification data available for all their product lines - [X](https://ark.intel.com/)

Their website also includes a very useful tool to compare an arbitrary number of processors, and allows downloading of the comparison data

Excluding any processor belonging to a family below E5 results in 302 processors total - [X](https://ark.intel.com/compare/?ids=67026,67025,67024,61426,61428,75778,75783,75788,75974,76158,76350,75973,76159,76160,84313,84317,84316,84315,84314,85761,86067,81905,81901,81704,83351,83350,93802,96901,91771,91759,91775,92982,92988,64592,64609,64615,64604,64614,64588,64602,64621,66662,64608,64617,64594,64601,64607,64603,64616,64620,64613,64593,64612,64622,64586,64606,64598,64611,64591,64610,64623,64587,64590,64585,64584,64597,64589,64595,64583,64582,64596,75793,75975,76157,75779,75782,75787,75794,75285,75780,75286,75781,75784,75789,75287,75785,75790,75288,75786,75791,75263,75289,75792,75267,75290,75264,75268,75265,75266,75269,75270,75272,75273,75275,75277,76161,75279,75281,75283,81061,85766,85765,82763,85764,81060,82764,85763,81059,82765,85762,82766,81057,82767,85760,81713,85759,81909,85758,85757,81055,81908,81709,83361,81706,81903,81705,81900,83359,83358,83357,83356,83354,83352,81897,83349,93805,93807,93796,93808,93809,93798,93799,93800,93812,96899,91317,91753,91755,91768,91316,91770,91750,91766,91754,92979,91772,91767,91752,92989,92984,92983,92981,92978,92980,92986,92990,92993,92992,92985,92994,92987,92991,53580,53577,53572,53575,53576,53677,53579,53571,53574,53676,53675,53569,53578,53570,53573,53674,53673,53568,75253,75254,75255,75257,75256,75258,75259,75260,75251,75773,75250,75249,75248,75247,75246,75245,75242,75241,75240,75239,84688,84686,84685,84684,84683,84682,84681,84680,84679,84678,84677,84676,96900,93791,93795,93790,93792,93801,93804,93793,93806,93811,93814,93794,120498,120496,120505,125056,120508,120507,120506,120504,120503,123543,120502,123687,120501,120500,120499,120497,120495,120491,120490,123690,120489,124942,124943,120488,123685,120487,120486,120485,123542,123686,120476,120479,120494,120493,123541,123545,123688,120492,120482,123548,123689,120483,120475,120477,120474,126154,120473,120484,126155,120481,126153,123550,123551,123547,123549,123544,123540,123546)

Downloading the comparison as an XML file is then possible - [X](https://ark.intel.com/compare?ids=67026,67025,67024,61426,61428,75778,75783,75788,75974,76158,76350,75973,76159,76160,84313,84317,84316,84315,84314,85761,86067,81905,81901,81704,83351,83350,93802,96901,91771,91759,91775,92982,92988,64592,64609,64615,64604,64614,64588,64602,64621,66662,64608,64617,64594,64601,64607,64603,64616,64620,64613,64593,64612,64622,64586,64606,64598,64611,64591,64610,64623,64587,64590,64585,64584,64597,64589,64595,64583,64582,64596,75793,75975,76157,75779,75782,75787,75794,75285,75780,75286,75781,75784,75789,75287,75785,75790,75288,75786,75791,75263,75289,75792,75267,75290,75264,75268,75265,75266,75269,75270,75272,75273,75275,75277,76161,75279,75281,75283,81061,85766,85765,82763,85764,81060,82764,85763,81059,82765,85762,82766,81057,82767,85760,81713,85759,81909,85758,85757,81055,81908,81709,83361,81706,81903,81705,81900,83359,83358,83357,83356,83354,83352,81897,83349,93805,93807,93796,93808,93809,93798,93799,93800,93812,96899,91317,91753,91755,91768,91316,91770,91750,91766,91754,92979,91772,91767,91752,92989,92984,92983,92981,92978,92980,92986,92990,92993,92992,92985,92994,92987,92991,53580,53577,53572,53575,53576,53677,53579,53571,53574,53676,53675,53569,53578,53570,53573,53674,53673,53568,75253,75254,75255,75257,75256,75258,75259,75260,75251,75773,75250,75249,75248,75247,75246,75245,75242,75241,75240,75239,84688,84686,84685,84684,84683,84682,84681,84680,84679,84678,84677,84676,96900,93791,93795,93790,93792,93801,93804,93793,93806,93811,93814,93794,120498,120496,120505,125056,120508,120507,120506,120504,120503,123543,120502,123687,120501,120500,120499,120497,120495,120491,120490,123690,120489,124942,124943,120488,123685,120487,120486,120485,123542,123686,120476,120479,120494,120493,123541,123545,123688,120492,120482,123548,123689,120483,120475,120477,120474,126154,120473,120484,126155,120481,126153,123550,123551,123547,123549,123544,123540,123546&e=t)

To parse the file and display interesting results, the following code was used:

```python
#!/usr/bin/env python3

from bs4 import BeautifulSoup as Soup
import io
import pandas

COMPARISON_FILE = "/Users/wvesey/Downloads/Intel_ARK_ComparisonChart_2018_03_07.xml"

# Load and parse the xml file
with open(COMPARISON_FILE, "r") as f:
    s = Soup(f, "xml")
data = []
ws = s.find("Worksheet")
for row in ws.findAll("Row"):
    row_data = []
    for cell in row.findAll("Cell"):
        cell_data = (None if cell.Data is None else cell.Data.text.strip())
        row_data.append(cell_data)
    if len(row_data) > 1:  # Some rows don't have useful information
        data.append(row_data)
data[0][0] = "Name"  # Processor names have no reference field

# Transform the data into a dataframe
data = [list(row) for row in zip(*data)]  # Transpose to fix xml data being backwards
colnames = data.pop(0)
df = pandas.DataFrame(data, columns=colnames)

# Begin selecting interesting processors, discounting those with no price data
interesting = df[df["Recommended Customer Price"].astype(str) != "N/A"]
interesting = interesting.reset_index(drop=True)

avg_prices = []  # Take the center of price data ranges such as '$2600 - $2750'
for price in interesting["Recommended Customer Price"]:
    if price.count(" - ") == 1:
        prices = price.split(" - ")
        avg_price = (float(prices[0][1:]) + float(prices[1][1:]))/2
    else:
        avg_price = float(price[1:])
    avg_prices.append(avg_price)
avg_prices = pandas.Series(avg_prices)

# Calculate $/thread
dollars_per_thread = avg_prices / interesting["# of Threads"].astype(float)

# Append calculated data to the dataframe
interesting = interesting.assign(**{"$/Thread": dollars_per_thread, "Price": avg_prices})

# Select processors with >28 threads and a $/thread value of <100
to_print = interesting[(interesting["# of Threads"].astype(float) > 28) & 
                       (interesting["$/Thread"] < 100)]
to_print = to_print.reset_index(drop=True)

# Print succinct information about the processors
to_print["$/Thread"] = to_print["$/Thread"].map("${:,.2f}".format)
to_print["Price"] = to_print["Price"].map("${:,.0f}".format)
pandas.options.display.max_colwidth = 100
to_print = to_print.sort_values("Name")
print(to_print.to_string(columns=["Name", "# of Threads", "Price", "$/Thread"], 
                         header=["Name", "# of Threads", "Price", "Price/Thread"],
                         index=False,
                         justify="left"))
```


