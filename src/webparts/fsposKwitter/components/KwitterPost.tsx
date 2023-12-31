import React, { useState } from "react";
import { getSP } from '../pnpjsConfig';
import { Icon } from '@fluentui/react/lib/Icon';
import dayjs from 'dayjs'; 
import relativeTime from 'dayjs/plugin/relativeTime';
import styles from './FsposKwitter.module.scss';

dayjs.extend(relativeTime);

interface IKwitterPostProps {
  showAll: boolean;
  items: any[];
  handleItemUpdate: (updatedItem: any) => void;
  currentUser: any;
  popularThreshold?: number;
  list: string;
}

const KwitterPost: React.FC<IKwitterPostProps> = ({ showAll, items, handleItemUpdate, currentUser, popularThreshold = 30, ...props }) => {
  const currentUserId = currentUser.loginName;
  const _sp = React.useRef(getSP());

  const [currentFilter, setCurrentFilter] = useState('');
  const [currentMention, setCurrentMention] = useState('');

  const updateLikedBy = async (item: any, updatedLikes: number, updatedLikedByArray: string[]) => {
    await _sp.current.web.lists.getByTitle(props.list).items.getById(item.Id).update({
      Likes: updatedLikes,
      Likedby: JSON.stringify(updatedLikedByArray)
    });
  };

  const onLike = async (item: any) => {
    const likedByArray = item.Likedby ? JSON.parse(item.Likedby) : [];
    let updatedLikes = item.Likes;
    let updatedLikedByArray = [...likedByArray];

    if (likedByArray.includes(currentUserId)) {
      updatedLikes -= 1;
      updatedLikedByArray = updatedLikedByArray.filter(id => id !== currentUserId);
    } else {
      updatedLikes += 1;
      updatedLikedByArray.push(currentUserId);
    }

    await updateLikedBy(item, updatedLikes, updatedLikedByArray);
    const updatedItem = { ...item, Likedby: JSON.stringify(updatedLikedByArray), Likes: updatedLikes };
    handleItemUpdate(updatedItem);
  };

  /*const extractMentions = (text: string) => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    return matches || [];
  };*/

  const filterItemsByUser = (items: any[]) => {
    if (showAll) return items;
    return items.filter(item => item.Title === currentUser.displayName);
  };

  const alreadyLiked = (item:any) => {
    const likedByArray = item.Likedby ? JSON.parse(item.Likedby) : [];

    if (likedByArray.includes(currentUserId)) {       
      return false;
    } else {     
      return true;
    }
}

  const filterItemsByHashtag = (items: any[]) => {
    if (!currentFilter) return items;
    return items.filter(item => {
      const hashtags = item.hashtag ? JSON.parse(item.hashtag) : [];
      return hashtags.includes(currentFilter);
    });
  };

  const itemsLiked = (items: any[]) => {    
    items.forEach(item => item.likedByUser = alreadyLiked(item));
    return items;
  }

  const filterItemsByMention = (items: any[]) => {
    if (!currentMention) return items;
    // Extract username from the currentMention (i.e., remove the '@' symbol)
    const mentionedUser = currentMention.replace('@', '').replace(/_/g, ' ').toLowerCase();
    const revertMentionTag = currentMention.replace(/ /g, '_').toLowerCase();
   // console.log("Mentioned user: " + mentionedUser);
    return items.filter(item => {
      console.log("item.Text");
      return item.Title.toLowerCase() === mentionedUser ||               
             (item.Text && item.Text.toLowerCase().includes(revertMentionTag));
    });
  };

  const renderHashtags = (hashtagString: string) => {
    const hashtags = hashtagString ? JSON.parse(hashtagString) : [];
    if (hashtags.length === 0 || hashtags[0] === '') return null;
    return hashtags.map((hashtag: any, index: any) => (
      <span key={index} onClick={() => setCurrentFilter(hashtag)} className={styles.hashtag}>#{hashtag}</span>
    ));
  };

  const renderMentions = (text: string) => {
    const mentionRegex = /(@\w+)/g;
    const parts = text.split(mentionRegex);
    return parts.map((part, index) => {
        if (part.indexOf('@') === 0) {
            return (
                <span 
                    key={index} 
                    onClick={() => setCurrentMention(part)} 
                    className={styles.mention ? styles.mention : ''}
                >
                    {part}  
                </span>
            );
        }
        return part;
    });
  };

  const getSeparatedPosts = (items: any[], threshold: number) => {
    let itemsLikedByUser = itemsLiked(items);
    const filteredItems = filterItemsByMention(filterItemsByHashtag(filterItemsByUser(itemsLikedByUser)));
    const popularPosts = filteredItems.filter(item => item.Likes > threshold).slice(0, 3);
    const regularPosts = filteredItems.filter(item => popularPosts.indexOf(item) === -1);
    return {
      popularPosts,
      regularPosts
    };
  };

  const { popularPosts, regularPosts } = getSeparatedPosts(items, popularThreshold);

  return (
    <div>
      {currentFilter && (
        <div>
          Filtering by: #{currentFilter}
          <button onClick={() => setCurrentFilter('')}>Clear Filter</button>
        </div>
      )}
      {currentMention && (
        <div>
          Filtering by: {currentMention}
          <button onClick={() => setCurrentMention('')}>Clear Mention Filter</button>
        </div>
      )}
      <section>
        {/* Render popular posts */}
        {popularPosts.map((item: any) => (
          <div className={styles["tweet-wrap"]} key={item.Id}>
            <img src={item.fulllogourl} className={styles.profileImage} alt="Profile" />
            <div className={styles["tweet-header"]}>
              <div className="tweet-header-info">
                <span>@{item.Title}</span> <span> {dayjs(item.Created).fromNow()} </span>
                <p>{renderMentions(item.Text)}</p>
                <div>{renderHashtags(item.hashtag)}</div>
                <div className={styles["tweet-info-counts"]}>
                  <Icon iconName={item.likedByUser == true ? "Like" : "LikeSolid" } onClick={() => onLike(item)} />
                  <div className={styles.likes}>{item.Likes}</div>
                  <Icon iconName="hashtag" />
                </div>
              </div>
            </div>
          </div>
        ))}
        {/* Render regular posts */}
        {regularPosts.map((item: any) => (
          <div className={styles["tweet-wrap"]} key={item.Id}>
            <img src={item.fulllogourl} className={styles.profileImage} alt="Profile" />
            <div className={styles["tweet-header"]}>
              <div className="tweet-header-info">
                <span>@{item.Title}</span> <span> {dayjs(item.Created).fromNow()} </span>
                <p>{renderMentions(item.Text)}</p>
                <div>{renderHashtags(item.hashtag)}</div>
                <div className={styles["tweet-info-counts"]}>
                  <Icon iconName={item.likedByUser == true ? "Like" : "LikeSolid" } onClick={() => onLike(item)} />
                  <div className={styles.likes}>{item.Likes}</div>
                  <Icon iconName="hashtag" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default KwitterPost;
