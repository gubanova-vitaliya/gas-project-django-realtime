package ds

type User struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Login       string `gorm:"type:varchar(50);not null;uniqueIndex" json:"login"`
	Password    string `gorm:"type:varchar(255);not null" json:"-"`
	IsModerator bool   `gorm:"type:boolean;not null;default:false" json:"is_moderator"`
}

// TableName задает имя таблицы
func (User) TableName() string {
	return "users"
}
