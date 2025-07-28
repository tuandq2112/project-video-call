package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/dgraph-io/badger/v4"
)

type Database struct {
	db *badger.DB
}

func NewDatabase() (*Database, error) {
	opts := badger.DefaultOptions("./data")
	opts.Logger = nil // Disable badger logging

	db, err := badger.Open(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %v", err)
	}

	return &Database{db: db}, nil
}

func (d *Database) Close() error {
	return d.db.Close()
}

// SaveUser saves a user to the database
func (d *Database) SaveUser(username string, user User) error {
	return d.db.Update(func(txn *badger.Txn) error {
		key := []byte(fmt.Sprintf("user:%s", username))
		value, err := json.Marshal(user)
		if err != nil {
			return fmt.Errorf("failed to marshal user: %v", err)
		}

		return txn.Set(key, value)
	})
}

// GetUser retrieves a user from the database
func (d *Database) GetUser(username string) (*User, error) {
	var user User
	err := d.db.View(func(txn *badger.Txn) error {
		key := []byte(fmt.Sprintf("user:%s", username))
		item, err := txn.Get(key)
		if err != nil {
			if err == badger.ErrKeyNotFound {
				return fmt.Errorf("user not found")
			}
			return fmt.Errorf("failed to get user: %v", err)
		}

		value, err := item.ValueCopy(nil)
		if err != nil {
			return fmt.Errorf("failed to copy value: %v", err)
		}

		if err := json.Unmarshal(value, &user); err != nil {
			return fmt.Errorf("failed to unmarshal user: %v", err)
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// GetAllUsers retrieves all users from the database
func (d *Database) GetAllUsers() (map[string]User, error) {
	users := make(map[string]User)

	err := d.db.View(func(txn *badger.Txn) error {
		opts := badger.DefaultIteratorOptions
		opts.Prefix = []byte("user:")

		it := txn.NewIterator(opts)
		defer it.Close()

		for it.Rewind(); it.Valid(); it.Next() {
			item := it.Item()
			key := item.Key()
			username := string(key[5:]) // Remove "user:" prefix

			value, err := item.ValueCopy(nil)
			if err != nil {
				log.Printf("Failed to copy value for user %s: %v", username, err)
				continue
			}

			var user User
			if err := json.Unmarshal(value, &user); err != nil {
				log.Printf("Failed to unmarshal user %s: %v", username, err)
				continue
			}

			users[username] = user
		}

		return nil
	})

	return users, err
}

// DeleteUser deletes a user from the database
func (d *Database) DeleteUser(username string) error {
	return d.db.Update(func(txn *badger.Txn) error {
		key := []byte(fmt.Sprintf("user:%s", username))
		return txn.Delete(key)
	})
}
