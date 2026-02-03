/**
 * Sphere Data Generator for Synoptic Panel Pro
 * 
 * Run by executing: node data-gen.js
 */

// Configuration
const eventsCount = 200;
const eventsDateRange = ["2023-10-01", "2024-12-31"];
const baseCountry = "US";
const eventsConfiguration = [
    {
        type: "Conference",
        distribution: 0.25,
        price: {
            min: 599,
            max: 999
        },
        customerAge: {
            min: 35,
            max: 69
        },
        seatSales: {    
            "Economy": {
                min: 0.5,
                max: 1
            },
            "Regular": {
                min: 0.3,
                max: 1
            },
            "Premium": {
                min: 0.1,
                max: 0.7
            },
            "Best": {
                min: 0.5,
                max: 0.8
            }
        }
    },
    {
        type: "Concert",
        distribution: 0.75,
        price: {
            min: 99,
            max: 129
        },
        customerAge: {
            min: 18,
            max: 39
        },
        seatSales: {    
            "Economy": {
                min: 0.2,
                max: 0.7
            },
            "Regular": {
                min: 0.6,
                max: 1
            },
            "Premium": {
                min: 0.1,
                max: 1
            },
            "Best": {
                min: 0.5,
                max: 0.8
            }
        }
    }
];
const categoryConfiguration = {
    "Economy": {
        priceModifier: 0.7,
    },
    "Regular": {
        priceModifier: 1,
    },
    "Premium": {
        priceModifier: 1.5,
    },
    "Best": {
        priceModifier: 2,
    }
};
const customersConfiguration = {
    localCustomerRate: {
        min: 0.5,
        max: 0.9
    },
    returningCustomerRate: {
        min: 0.01,
        max: 0.4
    }
};
const holidaysTypes = ["public"]; // "public", "observance", "optional", "bank", "school", "other"
const holidaysPriceModifier = 2;

// Target folder for the generated data
const targetFolder = "generated";

// Dependencies
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const { faker } = require('@faker-js/faker');
const { getName } = require('country-list');
const Holidays = require('date-holidays');

// Initialize the Holidays library
const hd = new Holidays(baseCountry, { types: holidaysTypes });

// Load seat data from the JSON file
const seatData = JSON.parse(fs.readFileSync('sphere-seats.json', 'utf8'));

// Load band names from the JSON file
const artistNames = JSON.parse(fs.readFileSync('artist-names.json', 'utf8'));

// Generate random dates for events
const eventDates = faker.date.betweens({ from: eventsDateRange[0], to: eventsDateRange[1], count: eventsCount }); //getRandomDates(eventsDateRange[0], eventsDateRange[1], eventsCount);

const customers = [];

/*
//TODO
function getRandomDates(from, to, count) {

    // Generate random dates for events
    const dates = faker.date.betweens({ from, to, count });
    // Remove duplicated dates
    dates.filter((date, index) => dates.indexOf(date) === index);
    // Add missing dates to reach the desired count
    while (dates.length < eventsCount) {
        const newDate = faker.date.between(eventsDateRange[0], eventsDateRange[1]);
        if (!dates.includes(newDate)) dates.push(newDate);
    }
    return dates;
}*/

// Randomly distribute values based on a given distribution
function getRandomDistribution(distribution, total) {
    const counts = [];
    const result = new Array(total).fill(null);

    for (let i = 0; i < total; i++) {
        let random = Math.floor(Math.random() * distribution.length);
        if (counts[random] && counts[random].length >= total * distribution[random]) {
            for (let j = 0; j < distribution.length; j++) {
                if (!counts[j] || counts[j].length < total * distribution[j]) {
                    random = j;
                    break;
                }
            }
        }

        if (!counts[random]) counts[random] = [];
        counts[random].push(i);

        result[i] = random;  // Assign the type index to the result array
    }
    return result;
}

// Generate random events
function generateEvents() {
    const events = [];
    const distribution = getRandomDistribution(eventsConfiguration.map(t => t.distribution), eventsCount);
    
    for (let i = 0; i < eventDates.length; i++) {
        const eventConfig = eventsConfiguration[distribution[i]];
        const eventDate = new Date(eventDates[i]);

        const eventOrganizer = (eventConfig.type === "Concert" ? 
            faker.helpers.arrayElement(artistNames)/*faker.music.artist()*/ : 
            faker.company.name()
        );
        const eventName = (eventConfig.type === "Concert" ? 
            eventOrganizer : 
            faker.company.catchPhrase()
        );

        events.push({
            id: i + 1,
            type: eventConfig,
            typeName: eventConfig.type,
            name: eventName,
            organizer: eventOrganizer,
            date: eventDate.toISOString().split('T')[0]
        });
    }
    return events;
}

function isHoliday(date) {
    return hd.isHoliday(new Date(date));
}

function generateTickets(events) {
    const tickets = [];
    let i = 0;
    events.forEach(event => {

        const datePriceModifier = isHoliday(event.date) ? holidaysPriceModifier : 1;
 
        for (category in seatData) {
            
            const saleRate = faker.number.float(event.type.seatSales[category]);
            const categoryConfig = categoryConfiguration[category];

            const sectors = seatData[category];
            for (sector in sectors) {
                sectors[sector].forEach(seatId => {

                    if (Math.random() < saleRate) {

                        const price = Math.floor(faker.number.int(event.type.price) * categoryConfig.priceModifier * datePriceModifier);

                        const isRecurringCustomer = Math.random() < faker.number.float(customersConfiguration.returningCustomerRate);

                        // Generate customer data
                        let customerId = 0;
                        if (isRecurringCustomer && customers.length > 0) {
                            const customer = faker.helpers.arrayElement(customers);
                            customerId = customer.id;
                        } else {
                            customerId = customers.length + 1;
                            const customerAge = faker.number.int(categoryConfig.customerAge);
                            const isLocalCustomer = Math.random() < faker.number.float(customersConfiguration.localCustomerRate);
                            const customerCountryCode = isLocalCustomer ? baseCountry : faker.location.countryCode();
                            customers.push({
                                id: customerId,
                                firstName: faker.person.firstName(),
                                lastName: faker.person.lastName(),
                                countryIso: customerCountryCode,
                                country: getName(customerCountryCode),
                                //city: faker.location.city(),
                                age: customerAge
                            }); 
                        }

                        tickets.push({
                            id: i++,
                            eventId: event.id,
                            customerId: customerId,
                            seatId: seatId,
                            price: price
                        });
                    }
                });
            }
        }
    });
    return tickets;
}

function generateSeatDetails() {
    const seats = [];
    Object.entries(seatData).forEach(([category, sectors]) => {
        Object.entries(sectors).forEach(([sector, seatIds]) => {
            seatIds.forEach(seatId => {
                seats.push({
                    id: seatId,
                    sector: sector,
                    category: category
                });
            });
        });
    });
    return seats;
}

// Generate all data
const events = generateEvents();
const tickets = generateTickets(events);
const seats = generateSeatDetails();

// Functions to write data to CSV
function writeDataToFile(fileName, header, data) {

    if (!fs.existsSync(targetFolder))
        fs.mkdirSync(targetFolder, { recursive: true });

    const csvWriter = createObjectCsvWriter({
        path: `./${targetFolder}/${fileName}.csv`,
        header: header,
        append: false
    });
    csvWriter.writeRecords(data)
        .then(() => {
            console.log(`${fileName}.csv was written successfully`);
        });
}

// Write to CSV
writeDataToFile('events', [
    {id: 'id', title: 'ID'},
    {id: 'typeName', title: 'Type'},
    {id: 'name', title: 'Name'},
    {id: 'organizer', title: 'Organizer'},
    {id: 'date', title: 'Date'}
], events);

writeDataToFile('tickets', [
    {id: 'id', title: 'ID'},
    {id: 'eventId', title: 'Event ID'},
    {id: 'customerId', title: 'Customer ID'},
    {id: 'seatId', title: 'Seat ID'},
    {id: 'price', title: 'Amount'}
], tickets);

writeDataToFile('customers', [
    {id: 'id', title: 'ID'},
    {id: 'firstName', title: 'First Name'},
    {id: 'lastName', title: 'Last Name'},
    {id: 'country', title: 'Country'},
    {id: 'countryIso', title: 'Country ISO'},
], customers);

writeDataToFile('seats', [
    {id: 'id', title: 'ID'},
    {id: 'sector', title: 'Sector'},
    {id: 'category', title: 'Category'}
], seats);
